const fs = require('fs');
const content = fs.readFileSync('i:\\Farming\\Farming\\কৃষিপ্রযুক্তি ওয়েব অ্যাপের পরিকল্পনা.txt', 'utf8');
const lines = content.split(/\r?\n/);
let output = [];

let tr = [];

for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) {
        output.push('');
        continue;
    }

    if (i === 0) { output.push('# ' + line); continue; }
    const h2s = [2, 38, 65, 69, 90, 101, 133];
    const h3s = [4, 8, 40, 42, 45, 48, 92, 98, 103, 109];

    if (h2s.includes(i)) { output.push('\n## ' + line); continue; }
    if (h3s.includes(i)) { output.push('\n### ' + line); continue; }

    if (i >= 14 && i <= 37) {
        tr.push(line);
        if (tr.length === 4) {
            output.push('| ' + tr.join(' | ') + ' |');
            if (i === 17) output.push('|---|---|---|---|');
            tr = [];
        }
        continue;
    }

    if (i >= 50 && i <= 64) {
        tr.push(line);
        if (tr.length === 3) {
            output.push('| ' + tr.join(' | ') + ' |');
            if (i === 52) output.push('|---|---|---|');
            tr = [];
        }
        continue;
    }

    if (i >= 74 && i <= 89) {
        tr.push(line);
        if (tr.length === 4) {
            output.push('| ' + tr.join(' | ') + ' |');
            if (i === 77) output.push('|---|---|---|---|');
            tr = [];
        }
        continue;
    }

    if (i >= 112 && i <= 129) {
        tr.push(line);
        if (tr.length === 3) {
            output.push('| ' + tr.join(' | ') + ' |');
            if (i === 114) output.push('|---|---|---|');
            tr = [];
        }
        continue;
    }

    line = line.replace(/\[span_\d+\]\(start_span\)/g, '').replace(/\[span_\d+\]\(end_span\)/g, '');

    if (i === 134) {
        let refs = line.split(/(?=(?:^|\s)\d+\.\s)/);
        output.push(refs.map(s => s.trim()).filter(Boolean).join('\n'));
        continue;
    }

    output.push(line + '\n');
}

fs.writeFileSync('i:\\Farming\\Farming\\কৃষিপ্রযুক্তি ওয়েব অ্যাপের পরিকল্পনা.md', output.join('\n').replace(/\n{3,}/g, '\n\n'), 'utf8');
