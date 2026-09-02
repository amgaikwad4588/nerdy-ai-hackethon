-- Seed the shared reference data (skills + misconception bank). Mirrors
-- src/lib/curriculum.ts so the live DB and the offline app agree.

insert into skills (id, code, title, domain, grade, prereq_ids) values
  ('place-value',  '3.NBT.A.1', 'Place Value',           'base-ten',   3, '{}'),
  ('multi-add',    '3.NBT.A.2', 'Multi-digit Addition',  'base-ten',   3, '{place-value}'),
  ('mult-facts',   '3.OA.C.7',  'Multiplication Facts',  'operations', 3, '{}'),
  ('mult-arrays',  '3.OA.A.3',  'Arrays & Area',         'operations', 3, '{mult-facts}'),
  ('frac-compare', '3.NF.A.3d', 'Comparing Fractions',   'fractions',  3, '{}'),
  ('frac-equiv',   '4.NF.A.1',  'Equivalent Fractions',  'fractions',  4, '{frac-compare}')
on conflict (id) do nothing;

insert into misconceptions (tag, skill_id, description, remediation) values
  ('bigger-denominator-bigger', 'frac-compare',
   'Thinks the fraction with the bigger denominator is larger (8 > 4, so 1/8 > 1/4).',
   'More equal pieces means each piece is smaller. Picture one pizza cut into 8 vs 4 slices.'),
  ('add-same-to-both', 'frac-equiv',
   'Builds equivalents by adding the same number to top and bottom instead of multiplying.',
   'Equivalent fractions come from multiplying top and bottom by the SAME factor, not adding.'),
  ('no-regrouping', 'multi-add',
   'Adds each column independently and writes both digits, skipping the carry.',
   'When a column adds past 9, carry the ten into the next column. Line up ones under ones.'),
  ('add-instead-of-multiply', 'mult-facts',
   'Adds the two factors instead of multiplying them (4x3 = 7).',
   'Multiplication is repeated addition: 4 x 3 means three groups of four. Skip-count it.'),
  ('perimeter-not-area', 'mult-arrays',
   'Counts the outside edge (perimeter) instead of the whole array (area).',
   'Count every dot inside, not just the border. Rows x columns fills the whole rectangle.'),
  ('ignored-place-zero', 'place-value',
   'Reads the digit value but ignores its place (says 3 instead of 300).',
   'A digit''s value depends on its column. The 3 in 305 sits in the hundreds place, so it is 300.')
on conflict (tag) do nothing;
