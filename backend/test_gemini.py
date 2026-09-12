"""Quick test to see what Gemini returns for a full pattern prompt."""
import json
import ast
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ['GEMINI_API_KEY'])

# Load first pattern
with open('server.py', encoding='utf-8') as f:
    source = f.read()
tree = ast.parse(source)
for node in ast.walk(tree):
    if isinstance(node, ast.Assign):
        for target in node.targets:
            if isinstance(target, ast.Name) and target.id == 'PREDEFINED_PATTERNS':
                patterns = ast.literal_eval(node.value)
                break

p = patterns[0]
prompt = f"""Tu es experte tricot/crochet. Ecris 7 etapes detaillees pour debutante. 2-5 phrases/etape, nombres exacts.

PATRON: {p['name']} | {p.get('technique', 'aiguilles')} | {p['difficulty']}
JAUGE: {p['gauge']}
TAILLES: {json.dumps(p['sizes'], ensure_ascii=False)}

JSON uniquement, PAS de markdown ni backticks:
[{{"step":1,"title":"Titre","instruction":"Texte."}}]"""

for model in ['gemini-3.6-flash', 'gemini-2.5-flash']:
    print(f"\nTesting model: {model}")
    try:
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=8192,
            ),
        )
        text = response.text.strip()

        with open(f'test_raw_{model.replace(".", "_")}.txt', 'w', encoding='utf-8') as f:
            f.write(text)

        print(f"Raw length: {len(text)} chars")

        # Clean markdown
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines).strip()

        steps = json.loads(text)
        print(f'SUCCESS: {len(steps)} steps')
        for s in steps:
            print(f'  Step {s["step"]}: {s["title"][:40]}')
        break
    except Exception as e:
        print(f'ERROR: {e}')
