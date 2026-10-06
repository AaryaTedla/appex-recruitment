-- 14-question APPEX seed. Total active points = 100.
insert into public.questions
(id, category, type, question_text, code_snippet, options, correct_answer, points, difficulty, is_active, sort_order)
values
('00000000-0000-0000-0000-000000000001', 'python_programming', 'code_output', 'What will this Python code print?', E'x = [2, 4, 6]\nprint(x[-1] + len(x))', '["6", "8", "9", "12"]'::jsonb, '9', 7.5, 'easy', true, 1),
('00000000-0000-0000-0000-000000000002', 'python_programming', 'code_output', 'What is the final output?', E'total = 0\nfor n in [1, 2, 3, 4]:\n    if n % 2 == 0:\n        total += n\nprint(total)', '["4", "6", "8", "10"]'::jsonb, '6', 7.5, 'easy', true, 2),
('00000000-0000-0000-0000-000000000003', 'computer_technology', 'mcq', 'You type a website address into a browser. What broadly needs to happen before the page can load?', null, '["The browser finds the server address, then requests the page over the network", "The keyboard sends the website directly to the server", "The browser copies the website from your RAM", "The operating system compiles the website first"]'::jsonb, 'The browser finds the server address, then requests the page over the network', 7.5, 'easy', true, 3),
('00000000-0000-0000-0000-000000000004', 'computer_technology', 'mcq', 'Which statement best describes RAM?', null, '["Temporary working memory used by running programs", "Permanent storage for files after shutdown", "The part that connects a laptop to Wi-Fi", "A programming language used by the operating system"]'::jsonb, 'Temporary working memory used by running programs', 7.5, 'easy', true, 4),
('00000000-0000-0000-0000-000000000005', 'aptitude_patterns', 'mcq', 'Find the next number: 3, 6, 11, 18, 27, ?', null, '["36", "37", "38", "39"]'::jsonb, '38', 10, 'easy', true, 5),
('00000000-0000-0000-0000-000000000006', 'aptitude_patterns', 'mcq', 'Find the next letter: A, C, F, J, O, ?', null, '["T", "U", "V", "W"]'::jsonb, 'U', 10, 'medium', true, 6),
('00000000-0000-0000-0000-000000000007', 'situational_decision', 'scenario_mcq', 'Your team has three hours left in a hackathon and the original idea is clearly too large. What is the best next move?', null, '["Keep the full scope and work faster", "Cut to the smallest useful version, assign clear tasks, and get one flow working", "Start over with a completely unrelated idea", "Wait for the mentor to decide everything"]'::jsonb, 'Cut to the smallest useful version, assign clear tasks, and get one flow working', 7.5, 'easy', true, 7),
('00000000-0000-0000-0000-000000000008', 'situational_decision', 'scenario_mcq', 'A teammate is stuck and has gone quiet while your deadline is getting close. What would you do first?', null, '["Ignore it and finish only your part", "Ask what is blocking them, help unblock or redistribute work, and keep the team informed", "Tell the team lead the teammate should be removed", "Rewrite their work without speaking to them"]'::jsonb, 'Ask what is blocking them, help unblock or redistribute work, and keep the team informed', 7.5, 'easy', true, 8),
('00000000-0000-0000-0000-000000000009', 'improvisation_problem_solving', 'short_text', 'You are given a problem you have never encountered before. What are the first two or three things you would do?', null, null, null, 10, 'easy', true, 9),
('00000000-0000-0000-0000-000000000010', 'improvisation_problem_solving', 'short_text', 'A demo works on your laptop but fails on the presentation laptop ten minutes before you present. How would you approach the problem?', null, null, null, 10, 'medium', true, 10),
('00000000-0000-0000-0000-000000000011', 'commitment_reliability', 'scenario_mcq', 'You realize you cannot finish an APPEX task by the agreed deadline. What should you do?', null, '["Stay silent and submit whenever it is ready", "Tell the team early, explain the blocker honestly, and agree on a revised plan or handoff", "Mark it complete so the deadline is not missed", "Wait until someone asks for an update"]'::jsonb, 'Tell the team early, explain the blocker honestly, and agree on a revised plan or handoff', 5, 'easy', true, 11),
('00000000-0000-0000-0000-000000000012', 'wildcard', 'creative', 'Explain Wi-Fi to a 5-year-old without using the words “internet”, “router”, or “signal”.', null, null, null, 3, 'easy', true, 12),
('00000000-0000-0000-0000-000000000013', 'wildcard', 'creative', 'You have ₹1,000 and one day. What small tech project would you build, and what would you deliberately leave out?', null, null, null, 3, 'easy', true, 13),
('00000000-0000-0000-0000-000000000014', 'wildcard', 'creative', 'A device has one mysterious button. Pressing it sometimes helps and sometimes makes things worse. You get five safe experiments before deciding what the button does. What would you test?', null, null, null, 4, 'medium', true, 14)
on conflict (id) do update set
  category = excluded.category,
  type = excluded.type,
  question_text = excluded.question_text,
  code_snippet = excluded.code_snippet,
  options = excluded.options,
  correct_answer = excluded.correct_answer,
  points = excluded.points,
  difficulty = excluded.difficulty,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();
