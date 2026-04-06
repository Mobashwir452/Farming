UPDATE ai_prompt_templates 
SET template_body = 'The user requested to grow crop: "{cropName}" and gave variety: "{varietyName}". Your FIRST JOB is to identify the single BEST, highest-yielding, disease-resistant specific variety (জাত) for this crop in Bangladesh. Provide data for EXACTLY 1 SHOTANGSHO (১ শতাংশ) of land for this chosen variety.
Output the chosen specific variety name strictly inside <variety_name> Tags (e.g. <variety_name>তরমুজ (বিগ বস)</variety_name>).
CRITICAL RULE: DO NOT SUGGEST ANY OF THESE FOLLOWING VARIETIES BECAUSE THEY ALREADY EXIST IN OUR DATABASE: {exclusionListStr}. Find a completely NEW and profitable variety!

[CRITICAL NEW INSTRUCTION for PLANTING METHOD]: YOU MUST decide the ONLY BEST, absolute optimal planting method for this specific variety (whether it is direct seeds, ready saplings from a nursery, or tubers/cuttings).
Within the VERY FIRST <step> in the <timeline> (day_offset 0), you MUST mention specifically that "এই জাতের জন্য [method] রোপণ করলে সবচেয়ে ভালো হবে" in the description.
Do NOT wait for user input on this. Provide the optimal financial estimate for "বীজ বা চারা" based precisely on this optimal chosen method.

[CRITICAL CONSISTENCY & MATH RULES]:
1. The exact fertilizers, pesticides, seeds, quantities, and their costs listed in your <financial_resources> block MUST 100% IDENTICALLY MATCH the actions and amounts you describe in your <timeline> block. You must NOT introduce any fertilizer or pesticide in the timeline that is missing from the resource list, and the quantities must match identically. Both blocks must be generated strictly representing exactly 1 Shotangsho (১ শতাংশ).
2. For Pesticides/Fungicides, the <amount> and <estimated_cost_bdt> must reflect the TOTAL requirement across the ENTIRE crop lifespan (Amount per dose × Number of total doses needed for 1 shotangsho).

[CRITICAL TIMELINE & TASKS RULES - MUST FOLLOW STRICTLY]:
1. TWO SEPARATE OUTPUTS: You MUST provide a short <timeline> (5-7 grouped steps for a high-level guideline) AND a separate <daily_tasks> array (a highly granular, fully unrolled daily to-do list for the farmer). 
2. EXACT CALCULATION: NEVER use vague phrases like "ফুল আসার পর" বা "রোগ দেখা দিলে" in the <day_offset>. You MUST calculate the exact biological day these events naturally occur for this specific variety and output a strict numerical <day_offset> (e.g., if flowering is at day 45, output <day_offset>45</day_offset>).
3. PRE-PLANTING NEGATIVE OFFSETS: All land preparation, bed making, basal dose application, and seed treatments MUST have a NEGATIVE <day_offset> (e.g., -7, -3). The actual planting/sowing day MUST be EXACTLY <day_offset>0</day_offset>.
4. UNROLL RECURRING TASKS: Inside <daily_tasks>, DO NOT group repeated actions. If a pesticide needs to be sprayed every 15 days, you MUST generate completely separate <task> tags for Day 15, Day 30, Day 45, etc., until harvest. 
5. LAND PREPARATION (চাষ ও গর্ত/মাদা তৈরি): You MUST explicitly detail the ploughing process in the timeline and tasks. State exactly how many ploughings are needed, how to plough, if pre-ploughing irrigation (সেচ) is needed, and the day gap between ploughings.
6. PIT/BED DIMENSIONS: If pits/holes (মাদা) are required, you MUST state exactly how many days after ploughing these holes must be prepared. You MUST output the exact size of the hole mathematically in FEET (e.g., 2x2x2 feet) and the exact distance between holes in FEET.
7. ADVANCED SMART FARMING ARCHITECTURE: Whatever modern system you recommend (Bed, Mulching, Greenhouse, Polyhouse, Net-house, etc.), you MUST explain the FULL SETUP PROCESS in extreme detail inside both <timeline> and <daily_tasks>. For Bed systems, explicitly output the Bed width, length (if applicable), height in FEET/INCHES, and the exact width/distance of the drain (নালা) between beds in FEET. For Mulching, detail the hole-making process and micron size.
8. FERTILIZER GAS RELEASE (গ্যাস কাটানো) & WAIT TIME: You CANNOT plant seeds or saplings immediately after applying basal/initial fertilizer (প্রাথমিক সার). You MUST allocate a scientifically accurate wait time (e.g., 7-10 days or whatever is exact for the crop) in your <day_offset> gap between fertilizer application and actual planting/sowing. Explicitly mention that this wait time is for "সারের গ্যাস কাটানো".
9. DEPENDENCY RULES (CRITICAL): Inside EVERY <task> inside <daily_tasks>, you MUST output two additional exact tags:
   - <min_gap_prev>: Formatted strictly as a positive integer (e.g., 5). This is the minimum required biological/chemical gap (in days) between this task and the previous task before it. If it does not depend on the previous task, output 0.
   - <gap_reason>: The scientific reason for this gap in Bengali (e.g., "দুই সারের মাঝে বিষক্রিয়া এড়াতে অন্তত ১০ দিন গ্যাপ প্রয়োজন"). If min_gap_prev is 0, leave empty.

Output your response STRICTLY using ONLY the following XML tags translated to Bengali. Do not write any markdown code blocks, do not write any intro/outro text, just output the raw XML tags. Do NOT use JSON structures.

<avg_duration_days>Write exactly digits only, e.g. 110</avg_duration_days>
<base_yield_kg>Write exactly digits only for 1 Shotangsho, e.g. 24</base_yield_kg>
<crop_market_price_bdt_per_kg>Write exactly digits only for 1 kg, e.g. 40</crop_market_price_bdt_per_kg>
<disease_resistance>Short text describing resistance, e.g. ব্লাস্ট ও পাতা পোড়া রোগ প্রতিরোধী</disease_resistance>
<disease_resistance_score>Write exactly digits 1 to 10</disease_resistance_score>
<planting_months>Comma separated English months, e.g. November, December</planting_months>
<crop_category>Write exactly ONE of these options in Bengali: সবজি, ফল, দানা, ডাল, তেল, ফুল, অর্থকরী, মসলা</crop_category>
<suitable_regions>Short text in Bengali, e.g. দেশের সব অঞ্চল (হাওর বাদে)</suitable_regions>
<soil_type>Short text in Bengali, e.g. দোআঁশ ও বেলে দোআঁশ মাটি</soil_type>
<special_features>Short text in Bengali, e.g. আগাম জাত, খরা সহনশীল</special_features>

<risks>
  <risk>
    <type>warning</type>
    <message>Short Bengali warning here</message>
  </risk>
</risks>

<project_lifespan>For short-term crops, state total days from seed to final harvest. For perennial trees explicitly state "গাছের মোট আয়ুষ্কাল ৩-৪ বছর এবং রোপণের ৬ মাস পর থেকে একটানা ২.৫ বছর ফলন দিবে।"</project_lifespan>

<financial_resources>
  <resource>
    <category>seed_or_sapling</category>
    <name>[পদ্ধতি অনুযায়ী নির্দিষ্ট নাম]</name>
    <amount>0.5 kg</amount>
    <estimated_cost_bdt>150</estimated_cost_bdt>
  </resource>
  <resource>
    <category>fertilizer</category>
    <name>ইউরিয়া সার</name>
    <amount>1 kg</amount>
    <estimated_cost_bdt>25</estimated_cost_bdt>
  </resource>
  <resource>
    <category>labor_and_other</category>
    <name>জমি তৈরি ও চাষের খরচ</name>
    <amount>--</amount>
    <estimated_cost_bdt>100</estimated_cost_bdt>
  </resource>
</financial_resources>

<timeline>
  <step>
    <day_offset>-7</day_offset>
    <title>১. জমি ও মাদা প্রস্তুতকরণ</title>
    <desc>কয়টি চাষ/মই দিতে হবে এবং মূল জমিতে কী কী প্রান্তিক/বেসাল সার দিতে হবে তার বিস্তারিত।</desc>
  </step>
</timeline>

<daily_tasks>
  <task>
    <day_offset>-7</day_offset>
    <min_gap_prev>0</min_gap_prev>
    <gap_reason></gap_reason>
    <title>জমি প্রস্তুত ও প্রথম সার</title>
    <desc>জমিতে চাষ দিয়ে টিএসপি ও পটাশ সার প্রয়োগ করুন।</desc>
  </task>
</daily_tasks>'
WHERE prompt_key = 'cache_generator_prompt';
