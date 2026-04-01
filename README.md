# EquiThera Premium

## Estrutura
- `index.html` -> tela da câmera
- `dashboard.html` -> tela de desempenho
- `style.css` -> visual
- `camera.js` -> webcam, calibração e leitura corporal
- `dashboard.js` -> protocolo, scoring e gráfico

## Como rodar
1. Abra um terminal dentro desta pasta.
2. Rode `python -m http.server 8000`
3. Abra `http://localhost:8000`

## Ordem de uso
1. Na tela da câmera, clique em **Iniciar câmera**.
2. Clique em **Iniciar leitura corporal**.
3. Fique inteiro no enquadramento.
4. Clique em **Calibrar postura neutra**.
5. Clique em **Abrir tela de desempenho**.
6. Na segunda tela, clique em **Iniciar tentativa**.
7. Ao terminar, clique em **Salvar tentativa**.
8. Use **Exportar gráfico PNG** para baixar o gráfico.

## Observações
- A leitura corporal usa MediaPipe por CDN, então a primeira execução precisa de internet.
- A webcam exige localhost ou HTTPS.
