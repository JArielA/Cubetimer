# Speedcube Timer

Timer para speedcubing hecho solo con HTML, CSS y JavaScript (sin dependencias ni build).

## Uso

Abre `index.html` en el navegador (o publícalo con GitHub Pages).

| Situación | Acción con **ESPACIO** |
|---|---|
| Reposo | Mantener 2 s y soltar → inicia la inspección |
| Inspección (15 s) | Pulsación rápida → corta la inspección e inicia la resolución |
| Inspección agotada | Inicia la resolución automáticamente |
| Resolviendo | Pulsación rápida → detiene el tiempo y lo guarda |

- Scramble de 20 movimientos válidos (sin repetir cara consecutiva ni tres movimientos seguidos en el mismo eje).
- Durante la inspección el fondo pasa de verde a rojo conforme se agota el tiempo.
- Historial, mejor tiempo, Ao5 y media guardados en `localStorage`.

## Publicar en GitHub

```bash
git init
git add .
git commit -m "Speedcube timer"
git branch -M main
git remote add origin https://github.com/<usuario>/speedcube-timer.git
git push -u origin main
```

Para GitHub Pages: *Settings → Pages → Deploy from a branch → `main` / root*.
