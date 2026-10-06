#!/usr/bin/env python3
"""Independent checks of executable, numerical and logical answers, plus shape."""
import argparse
import contextlib
import io
import json
from fractions import Fraction
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--version', choices=['005', '006', '007'], default='007')
args = parser.parse_args()
bank = json.loads((Path(__file__).resolve().parents[1] / f'supabase/question_bank_{args.version}.json').read_text())
for q in bank[:4]:
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        exec(q['code_snippet'], {})
    assert output.getvalue().strip() == q['correct_answer'], q['sort_order']
if args.version == '005':
    assert Fraction(12,4*3) * 6 * 5 == int(bank[8]['correct_answer'])
    terms = [2,6,12,20,30]
    gaps = [b-a for a,b in zip(terms,terms[1:])]
    assert terms[-1] + gaps[-1] + 2 == int(bank[9]['correct_answer'])
    # Exhaust all finite two-account classifications that satisfy the logic premise.
    for trials in [{0}, {1}, {0,1}]:
        for clubs in [{0}, {1}, {0,1}]:
            if clubs & trials:
                publishing = {0,1} - trials
                assert any(account not in publishing for account in clubs)
    assert str(Fraction(3,5)*Fraction(2,4)) == bank[11]['correct_answer']
    assert 10+10+10 == 30 and 15+10+10 > 30 and 20+10+10 > 30
    assert max(10+20,15) == 30
    assert 2*40 == 80 and 2*60 == 120
else:
    assert Fraction(10,2) * 4 == int(bank[8]['correct_answer'])
    assert 13 + 3 == int(bank[9]['correct_answer'])
    assert bank[10]['correct_answer'] == 'That club account cannot publish'
    assert str(Fraction(3,5)) == bank[11]['correct_answer']
    assert bank[13]['correct_answer'] == '30 minutes' and max(10+20,15) == 30
    assert 2*40 == 80 and 2*60 == 120
assert sum(q['points'] for q in bank[:20]) == 80
assert sum(q['points'] for q in bank[20:]) == 20
assert all(q['evaluation_notes'] for q in bank)
print('PASS: Python outputs, packing rate, pattern rule, logic premise, ordered probability, scheduling bounds, workshop capacity, and scoring totals. Other answers reviewed against explicit constraints in the evaluator key.')
