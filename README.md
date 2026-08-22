# Ominirout

Site para organizar mixes 5x5 de Counter-Strike 2 entre amigos. Cada dia da semana tem listas, cada lista comporta 10 jogadores (5 confirmados + 5 reservas). Cores indicam status: verde (faltam players), amarelo (time formado), vermelho (lista fechada). Quando o dia vira, listas que bateram 10 vão pro histórico e as incompletas somem.

## Setup rápido

### 1. Firebase

1. Acesse https://console.firebase.google.com/
2. **Add project** → nome `Ominirout` → desmarcar Analytics → criar
3. No painel, vá em **Realtime Database → Create Database**
   - Região: `southamerica-east1` (São Paulo)
   - Modo: **Locked**
4. Clique no ícone **Web (`</>`)** para registrar um app
   - Apelido: `Ominirout Web`
   - Copie o objeto `firebaseConfig` que aparece
5. Cole em `js/firebase-config.js` no lugar do placeholder
6. Vá em **Realtime Database → Rules** e cole:

```json
{
  "rules": {
    "lists":   { ".read": true, ".write": true },
    "history": { ".read": true, ".write": true },
    "meta":    { ".read": true, ".write": true }
  }
}
```

### 2. Testar local

Abra um servidor local na pasta do projeto. Opções:

```powershell
# Python 3
python -m http.server 8080

# Node.js (se tiver npx)
npx serve .
```

Acesse `http://localhost:8080`. O modal de nick deve aparecer.

### 3. Deploy no GitHub Pages

```powershell
cd "C:\Users\M.JUNIOR\Desktop\Ominirout"
git init
git add .
git commit -m "feat: site de mixes Ominirout"
git branch -M main
git remote add origin https://github.com/<seu-usuario>/ominirout.git
git push -u origin main
```

No GitHub: **Settings → Pages → Source = main / (root)**

URL final: `https://<seu-usuario>.github.io/ominirout/`

## Funcionalidades

- **7 dias da semana** como cards na home (Seg→Dom)
- **Criar lista**: escolhe tipo (online/presencial) e horário
- **Entrar/sair**: nick salvo no localStorage, sem login
- **Fila de espera**: até 5 reservas quando a lista enche
- **Cores por status**:
  - 🟢 1-4 confirmados → verde (faltam players)
  - 🟡 5-9 confirmados → amarelo (time formado)
  - 🔴 10 confirmados → vermelho hot (lista fechada)
- **Virada de dia**: ao passar da meia-noite, listas fechadas vão pro histórico, incompletas somem
- **Histórico**: página separada com todas as listas que jogaram

## Estrutura

```
Ominirout/
├── index.html          # Home com 7 cards
├── historico.html      # Página de histórico
├── css/
│   └── styles.css      # Tema dark/gamer
├── js/
│   ├── firebase-config.js  # Config do Firebase (cole suas credenciais)
│   ├── db.js               # Wrappers de leitura/escrita
│   ├── identity.js         # Nick em localStorage
│   ├── ui-home.js          # Render da home
│   ├── ui-history.js       # Render do histórico
│   ├── day-rollover.js     # Virada de dia
│   └── utils.js            # Helpers
└── README.md
```

## Stack

- HTML/CSS/JS estático (sem framework, sem build)
- Firebase Realtime Database (sync em tempo real)
- GitHub Pages (hospedagem gratuita)

## Licença

MIT
