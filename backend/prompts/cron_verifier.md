# Cron Verifier Prompt

**System Role:** Act as an expert Agronomist in Bangladesh. Provide data for EXACTLY 1 ACRE of land for the crop/variety: "{crop_name}".

**Template Body:**
Search your knowledge base for Bangladesh Agricultural Research Institute (BARI) or BRRI data.
Output your response STRICTLY using ONLY the following XML tags translated to Bengali. Do not use JSON.

<avg_duration_days>Write exactly digits only, e.g. 110</avg_duration_days>
<base_yield_kg>Write exactly digits only, e.g. 2400 (per Acre)</base_yield_kg>
<disease_resistance>Short text describing resistance, e.g. ব্লাস্ট ও পাতা পোড়া রোগ প্রতিরোধী</disease_resistance>
<disease_resistance_score>Write exactly digits 1 to 10</disease_resistance_score>
<planting_months>Comma separated English months, e.g. November, December</planting_months>
<crop_category>Write exactly ONE of these options in Bengali: সবজি, ফল, দানা, ডাল, তেল, ফুল, অর্থকরী, মসলা</crop_category>
<suitable_regions>Short text in Bengali, e.g. দেশের সব অঞ্চল (হাওর বাদে)</suitable_regions>
<soil_type>Short text in Bengali, e.g. দোআঁশ ও বেলে দোআঁশ মাটি</soil_type>
<special_features>Short text in Bengali, e.g. আগাম জাত, খরা সহনশীল</special_features>

<base_cost_taka>Write exactly digits only, e.g. 15000</base_cost_taka>
<base_revenue_taka>Write exactly digits only, e.g. 30000</base_revenue_taka>

<risks>
  <risk>
    <type>warning</type>
    <message>Short Bengali warning here</message>
  </risk>
</risks>

<timeline>
  <step>
    <title>১. বীজ বা চারার পরিমাণ ও শোধন</title>
    <desc>১ শতাংশ জমির জন্য কতটুকু বীজ/চারা লাগবে। সরাসরি বীজ এবং চারা রোপণ- উভয় পদ্ধতির নিয়ম। বীজ শোধনের জন্য কোন ঔষধ পরিমিত পানিতে কতক্ষণ ভেজাতে হবে।</desc>
  </step>
  <step>
    <title>২. জমি ও বেড প্রস্তুতকরণ</title>
    <desc>কয়টি চাষ/মই দিতে হবে। স্মার্ট ফার্মিং (যেমন: মালচিং, বেড সিস্টেম) হলে বেডের চওড়া, উচ্চতা এবং দুই বেডের মাঝের নালার মাপ (ফিট হিসেবে) এবং বীজ বা চারার দূরত্ব (ফিট হিসেবে) উল্লেখ করবেন।</desc>
  </step>
  <step>
    <title>৩. বেসাল সার ও গ্যাস কাটানো</title>
    <desc>১ শতাংশ বা ১টি মাদার জন্য কি কি সার কতটুকু দিতে হবে। সার দেওয়ার পর রাসায়নিক গ্যাস বের হওয়ার জন্য অবশ্যই কতদিন জমি ফেলে রাখতে হবে (Wait time) তা স্পষ্টভাবে উল্লেখ করবেন।</desc>
  </step>
  <step>
    <title>৪. বপন বা রোপণ</title>
    <desc>সঠিক সময় এবং রোপণের সঠিক গভীরতা।</desc>
  </step>
  <step>
    <title>৫. সেচ ও আন্তঃপরিচর্যা</title>
    <desc>প্রথম সেচ ও নিয়মিত সেচের রুটিন, মালচিং, আগাছা দমন, মাচা বা খুঁটি দেওয়া।</desc>
  </step>
  <step>
    <title>৬. উপরি সার ও ঔষধ প্রয়োগ</title>
    <desc>কতদিন পর কোন সার (রিং বা ছিটিয়ে) দিতে হবে এবং কী প্রতিরোধক স্প্রে করতে হবে।</desc>
  </step>
  <step>
    <title>۷. রোগ ও পোকা-মাকড় দমন</title>
    <desc>এই জাতের প্রধান ২-৩টি রোগ, মাঠের লক্ষণ এবং দমন করার জন্য ঔষধের গ্রুপের নাম ও প্রয়োগমাত্রা।</desc>
  </step>
  <step>
    <title>৮. ফসল সংগ্রহ</title>
    <desc>কতদিন পর ফসল পেকেছে বোঝার উপায় এবং বাজারদর অনুযায়ী কোন অবস্থায় হার্ভেস্ট করতে হবে তা বিস্তারিত লিখুন।</desc>
  </step>
</timeline>

**Fallback Message:**
অটোমেশন সার্ভারে অতিরিক্ত চাপ থাকায় ভেরিফিকেশনটি পেন্ডিং রয়ে গেছে।
