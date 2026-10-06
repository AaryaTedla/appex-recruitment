#!/usr/bin/env python3
"""Generate fresh-install seed and migration bank from the evaluator-only source.
Use --check to verify generated files without changing them.
"""
import argparse
import json
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parents[1]
bank = json.loads((root / 'supabase/question_bank_005.json').read_text())
objective = [q for q in bank if q['type'] in ('mcq', 'code_output', 'scenario_mcq', 'true_false')]
assert len(bank) == 22 and len(objective) == 20
assert sum(q['points'] for q in bank) == 100
assert len({q['id'] for q in bank}) == len(bank)
assert [q['sort_order'] for q in bank] == list(range(1, 23))
assert Counter(q['difficulty'] for q in objective) == {'easy': 10, 'medium': 10}
assert Counter(q['category'] for q in objective) == {'python_programming': 4, 'computer_technology': 4, 'aptitude_patterns': 4, 'situational_decision': 4, 'commitment_reliability': 2, 'wildcard': 2}
for q in objective:
    assert q['points'] == 4 and len(q['options']) == len(set(q['options'])) == 4
    assert q['correct_answer'] in q['options'] and q['evaluation_notes']
assert Counter(q['options'].index(q['correct_answer']) for q in objective) == {0: 5, 1: 5, 2: 5, 3: 5}
for q in bank[20:]:
    assert q['points'] == 10 and q['options'] is None and q['correct_answer'] is None

fields = ['id', 'category', 'type', 'question_text', 'code_snippet', 'options', 'correct_answer', 'points', 'difficulty', 'is_active', 'sort_order', 'evaluation_notes']
def literal(value):
    if value is None: return 'null'
    if isinstance(value, bool): return 'true' if value else 'false'
    if isinstance(value, (int, float)): return str(value)
    if isinstance(value, list): return "'" + json.dumps(value, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    return "'" + value.replace("'", "''") + "'"
values = ',\n'.join('(' + ', '.join(literal(q[k]) for k in fields) + ')' for q in bank)
seed = '-- Fresh installations only: 20 MCQs + 2 descriptive tasks, 100 points.\n-- Existing installations must use migration 005 instead of rerunning this file.\ninsert into public.questions\n(' + ', '.join(fields) + ')\nvalues\n' + values + '\non conflict (id) do nothing;\n'
# Staging allows content validation before any active bank is replaced.
types = ['uuid', 'text', 'text', 'text', 'text', 'jsonb', 'text', 'numeric', 'text', 'boolean', 'integer', 'text']
stage = '''create temporary table appex_bank_005 (like public.questions including defaults) on commit drop;
insert into appex_bank_005 (''' + ', '.join(fields) + ''')
select ''' + ', '.join('q.' + k for k in fields) + ''' from jsonb_to_recordset($bank005$''' + json.dumps(bank, ensure_ascii=False) + '''$bank005$::jsonb)
as q(''' + ', '.join(k + ' ' + t for k, t in zip(fields, types)) + ''');

-- Never overwrite previously used content or silently accept a modified bank.
do $$ begin
  if exists(select 1 from public.questions q join appex_bank_005 b on b.id=q.id
    where row(''' + ', '.join('q.' + k for k in fields if k != 'is_active') + ''') is distinct from row(''' + ', '.join('b.' + k for k in fields if k != 'is_active') + ''')) then
    raise exception 'Bank 005 content differs from its original version; create a new bank version instead';
  end if;
end $$;
update public.questions set is_active=false where is_active;
insert into public.questions (''' + ', '.join(fields) + ''')
select ''' + ', '.join('false' if k == 'is_active' else k for k in fields) + ''' from appex_bank_005 on conflict (id) do nothing;
update public.questions set is_active=true where id in (select id from appex_bank_005);
'''
migration_path = root / 'supabase/migrations/005_test_bank.sql'
current = migration_path.read_text()
start = '-- BEGIN GENERATED BANK 005\n'
end = '-- END GENERATED BANK 005'
new = current.split(start)[0] + start + stage + end + current.split(end)[1]
check = argparse.ArgumentParser()
check.add_argument('--check', action='store_true')
args = check.parse_args()
for path, content in [(root / 'supabase/seed.sql', seed), (migration_path, new)]:
    if args.check:
        assert path.read_text() == content, f'{path.name} differs from generated content'
    else:
        path.write_text(content)
print('Bank verified: 20 objective + 2 descriptive, 100 points, 10 easy/10 medium MCQs, 5 correct answers per option position.')
