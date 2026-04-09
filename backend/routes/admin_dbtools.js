import { json, error } from 'itty-router';

function getImageKeyFromPublicUrl(urlString) {
    if (!urlString) return null;
    try {
        // Handle both relative and absolute URLs
        const u = urlString.startsWith('http') ? new URL(urlString) : new URL(urlString, 'http://localhost');
        const marker = '/api/public/images/';
        const idx = u.pathname.indexOf(marker);
        if (idx === -1) return null;
        const encodedKey = u.pathname.slice(idx + marker.length);
        return decodeURIComponent(encodedKey);
    } catch {
        return null;
    }
}

function withWebpExt(key) {
    if (!key) return null;
    const lastSlash = key.lastIndexOf('/');
    const dir = lastSlash >= 0 ? key.slice(0, lastSlash + 1) : '';
    const name = lastSlash >= 0 ? key.slice(lastSlash + 1) : key;
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    return `${dir}${base}-compressed.webp`;
}

async function detectImageMeta(url, env) {
    const key = getImageKeyFromPublicUrl(url);
    if (key) {
        const obj = await env.IMAGE_BUCKET.head(key);
        const contentType = (obj?.httpMetadata?.contentType || '').toLowerCase();
        const sizeBytes = Number(obj?.size || 0);
        return { key, contentType, sizeBytes };
    }
    try {
        const headRes = await fetch(url, { method: 'HEAD' });
        const contentType = (headRes.headers.get('content-type') || '').toLowerCase();
        const sizeBytes = Number(headRes.headers.get('content-length') || 0);
        return { key: null, contentType, sizeBytes };
    } catch {
        return { key: null, contentType: '', sizeBytes: 0 };
    }
}

function buildFallbackKey(prefix, cropId, bedId, idxA, idxB) {
    const ts = Date.now();
    return `${prefix}/crop-${cropId || 'na'}/bed-${bedId || 'na'}/${ts}-${idxA}-${idxB}.webp`;
}

async function fetchCompressedWebP(url, width, quality) {
    const res = await fetch(url, {
        cf: {
            image: {
                format: 'webp',
                quality,
                width
            }
        }
    });

    if (!res.ok) {
        throw new Error(`image fetch failed (${res.status})`);
    }

    const arr = await res.arrayBuffer();
    if (!arr || arr.byteLength === 0) {
        throw new Error('empty image buffer');
    }
    return arr;
}

export async function compressUncompressedImages(request, env) {
    try {
        let body = {};
        try {
            body = await request.json();
        } catch {
            body = {};
        }

        const maxImages = Number(body.max_images || 250);
        const maxWidth = Number(body.max_width || 1024);
        const quality = Number(body.quality || 80);
        const dryRun = Boolean(body.dry_run);
        const recompressLargeWebp = Boolean(body.recompress_large_webp ?? true);
        const maxKeepBytes = Number(body.max_keep_bytes || 350000); // ~342 KB
        const origin = new URL(request.url).origin;

        const stats = {
            success: true,
            total: 0,
            compressed: 0,
            skipped: 0,
            skipped_webp: 0,
            recompressed_webp: 0,
            skipped_no_url: 0,
            failed: 0,
            updated_beds: 0,
            updated_plant_logs: 0,
            dry_run: dryRun,
            logs: []
        };

        const { results: beds } = await env.DB.prepare(
            'SELECT id, crop_id, plants_nodes_json FROM crop_beds ORDER BY id ASC'
        ).all();

        const processImage = async (imageUrl, ctx) => {
            stats.total += 1;
            if (!imageUrl) {
                stats.skipped_no_url += 1;
                return { ok: false, skipped: true, reason: 'no-url' };
            }

            try {
                const detected = await detectImageMeta(imageUrl, env);
                const isWebp = detected.contentType.includes('image/webp');
                const shouldRecompressLargeWebp = isWebp && recompressLargeWebp && detected.sizeBytes > maxKeepBytes;

                if (isWebp && !shouldRecompressLargeWebp) {
                    stats.skipped_webp += 1;
                    return { ok: false, skipped: true, reason: 'already-webp-small-enough' };
                }

                const webpBuffer = await fetchCompressedWebP(imageUrl, maxWidth, quality);
                const fallbackKey = buildFallbackKey('compressed', ctx.cropId, ctx.bedId, ctx.i, ctx.j);
                const newKey = withWebpExt(detected.key) || fallbackKey;

                if (!dryRun) {
                    await env.IMAGE_BUCKET.put(newKey, webpBuffer, {
                        httpMetadata: { contentType: 'image/webp' }
                    });
                }

                stats.compressed += 1;
                if (shouldRecompressLargeWebp) stats.recompressed_webp += 1;
                const newUrl = `${origin}/api/public/images/${encodeURIComponent(newKey)}`;
                return { ok: true, newUrl };
            } catch (e) {
                stats.failed += 1;
                stats.logs.push(`Failed [${ctx.source}] bed=${ctx.bedId || 'na'}: ${e.message}`);
                return { ok: false, skipped: false, reason: 'failed' };
            }
        };

        outer: for (const bed of (beds || [])) {
            let nodes = [];
            try {
                nodes = typeof bed.plants_nodes_json === 'string'
                    ? JSON.parse(bed.plants_nodes_json || '[]')
                    : (bed.plants_nodes_json || []);
            } catch {
                stats.logs.push(`Bed ${bed.id}: invalid plants_nodes_json, skipped.`);
                continue;
            }

            let bedChanged = false;

            for (let n = 0; n < nodes.length; n++) {
                const node = nodes[n];
                if (!node || !Array.isArray(node.logs)) continue;

                for (let l = 0; l < node.logs.length; l++) {
                    if (stats.total >= maxImages) {
                        stats.logs.push(`Reached max_images=${maxImages}, stopping.`);
                        break outer;
                    }

                    const logItem = node.logs[l];
                    const imageUrl = logItem?.image_url;
                    const result = await processImage(imageUrl, {
                        source: 'beds-json',
                        cropId: bed.crop_id,
                        bedId: bed.id,
                        i: n,
                        j: l
                    });
                    if (result.ok && !dryRun) {
                        node.logs[l].image_url = result.newUrl;
                        bedChanged = true;
                    }
                }
            }

            if (bedChanged && !dryRun) {
                await env.DB.prepare('UPDATE crop_beds SET plants_nodes_json = ? WHERE id = ?')
                    .bind(JSON.stringify(nodes), bed.id)
                    .run();
                stats.updated_beds += 1;
            }
        }

        if (stats.total < maxImages) {
            const { results: plantLogRows } = await env.DB.prepare(
                'SELECT id, bed_id, image_url FROM plant_logs WHERE image_url IS NOT NULL AND TRIM(image_url) != "" ORDER BY id ASC'
            ).all();

            for (let i = 0; i < (plantLogRows || []).length; i++) {
                if (stats.total >= maxImages) break;
                const row = plantLogRows[i];
                const result = await processImage(row.image_url, {
                    source: 'plant_logs',
                    cropId: null,
                    bedId: row.bed_id,
                    i,
                    j: row.id
                });
                if (result.ok && !dryRun) {
                    await env.DB.prepare('UPDATE plant_logs SET image_url = ? WHERE id = ?')
                        .bind(result.newUrl, row.id)
                        .run();
                    stats.updated_plant_logs += 1;
                }
            }
        }

        stats.skipped = stats.skipped_webp + stats.skipped_no_url;
        stats.logs.push(
            `Done. total=${stats.total}, compressed=${stats.compressed}, recompressed_webp=${stats.recompressed_webp}, skipped=${stats.skipped} (webp=${stats.skipped_webp}, no_url=${stats.skipped_no_url}), failed=${stats.failed}, updated_beds=${stats.updated_beds}, updated_plant_logs=${stats.updated_plant_logs}`
        );
        return json(stats);
    } catch (e) {
        return error(500, `Compression job failed: ${e.message}`);
    }
}

export async function findOrphanImages(request, env) {
    try {
        const validKeys = new Set();
        
        // 1. Fetch valid image URLs from crop_beds
        const { results: beds } = await env.DB.prepare('SELECT plants_nodes_json FROM crop_beds').all();
        if (beds) {
            for (const bed of beds) {
                if (!bed.plants_nodes_json) continue;
                let nodes = [];
                try {
                    nodes = typeof bed.plants_nodes_json === 'string'
                        ? JSON.parse(bed.plants_nodes_json)
                        : bed.plants_nodes_json;
                } catch { continue; }
                
                for (const node of nodes) {
                    if (node.logs && Array.isArray(node.logs)) {
                        for (const log of node.logs) {
                            if (log.image_url) {
                                const key = getImageKeyFromPublicUrl(log.image_url);
                                if (key) validKeys.add(key);
                            }
                        }
                    }
                }
            }
        }
        
        // 2. Fetch valid image URLs from plant_logs
        const { results: plantLogs } = await env.DB.prepare('SELECT image_url FROM plant_logs WHERE image_url IS NOT NULL').all();
        if (plantLogs) {
            for (const row of plantLogs) {
                const key = getImageKeyFromPublicUrl(row.image_url);
                if (key) validKeys.add(key);
            }
        }
        
        // 3. Optional: Add crop-scans from public scans if needed
        // Since we are tracking all images, including public scans:
        const { results: scans } = await env.DB.prepare('SELECT image_url FROM crop_scans WHERE image_url IS NOT NULL').all();
        if (scans) {
             for (const row of scans) {
                const key = getImageKeyFromPublicUrl(row.image_url);
                if (key) validKeys.add(key);
            }
        }
        
        // 4. Fetch all objects from R2 bucket
        let orphans = [];
        let totalOrphanSize = 0;
        let bucketScannedCount = 0;
        
        let cursor = undefined;
        let hasMore = true;
        
        while (hasMore) {
            const listRes = await env.IMAGE_BUCKET.list({ cursor });
            if (!listRes || !listRes.objects) break;
            
            for (const obj of listRes.objects) {
                bucketScannedCount++;
                if (!validKeys.has(obj.key)) {
                    orphans.push({ key: obj.key, size: obj.size, uploadedAt: obj.uploaded });
                    totalOrphanSize += obj.size;
                }
            }
            
            hasMore = listRes.truncated;
            cursor = listRes.truncated ? listRes.cursor : undefined;
        }
        
        return json({
            success: true,
            total_bucket_items: bucketScannedCount,
            total_valid_db_items: validKeys.size,
            orphan_count: orphans.length,
            orphan_size_bytes: totalOrphanSize,
            orphans: orphans
        });

    } catch (e) {
        return error(500, `Find orphans failed: ${e.message}`);
    }
}

export async function deleteOrphanImages(request, env) {
    try {
        const body = await request.json();
        if (!body.keys || !Array.isArray(body.keys)) {
            return error(400, 'Invalid request, expected array of keys');
        }
        
        const keysToDelete = body.keys;
        if (keysToDelete.length === 0) {
            return json({ success: true, deleted: 0 });
        }
        
        // delete in batches to avoid overwhelming the api if there are thousands
        const BATCH_SIZE = 500;
        let deletedCount = 0;
        for (let i = 0; i < keysToDelete.length; i += BATCH_SIZE) {
            const batch = keysToDelete.slice(i, i + BATCH_SIZE);
            await env.IMAGE_BUCKET.delete(batch);
            deletedCount += batch.length;
        }

        return json({
            success: true,
            deleted: deletedCount,
            message: `Deleted ${deletedCount} orphan images.`
        });
    } catch (e) {
        return error(500, `Delete orphans failed: ${e.message}`);
    }
}

