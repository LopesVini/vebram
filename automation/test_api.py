import os
import json
import urllib.request
import urllib.error

# A chave NÃO fica escrita no código. Defina no terminal antes de rodar:
#   export AUTOMATION_API_KEY="sua-chave"
#   python automation/test_api.py
API_KEY = os.getenv("AUTOMATION_API_KEY")
if not API_KEY:
    raise SystemExit("Defina a variável de ambiente AUTOMATION_API_KEY antes de rodar este teste.")

url = os.getenv("AUTOMATION_URL", "https://vertice-automation.onrender.com/process-quote")
headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
}
data = {
    "nome": "Teste",
    "email": "teste@exemplo.com",
    "celular": "3199999999",
    "cidade": "BH",
    "tipo": "Projeto",
    "mensagem": "Teste automation"
}

req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")

try:
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print("Response:", response.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Error Body:", e.read().decode("utf-8"))
except Exception as e:
    print("Error:", str(e))
