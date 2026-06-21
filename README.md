# WiZ Control

<p>
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white">
  <img src="https://img.shields.io/badge/Flask-3.0-000?logo=flask&logoColor=white">
  <img src="https://img.shields.io/badge/UDP-38899-0066FF">
</p>

Panel web local para controlar una lámpara WiZ desde tu Mac. No usa la nube,
habla directo con la lámpara por UDP en tu red WiFi.

## Funcionalidades

- **Encender / Apagar**
- **Brillo** ajustable (10–100%)
- **Color RGB** con selector
- **Temperatura de blanco** (2200K–6500K)
- **Escaneo automático** de lámparas en la red
- IP manual si el broadcast no funciona

## Cómo usar

```bash
git clone https://github.com/dotfn/wiz-control
cd wiz-control
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 server.py
```

Abrí el navegador en **http://localhost:5001**

## Encontrar tu lámpara

Apretá el botón **Buscar** en la página: manda un mensaje a toda tu red WiFi
y lista las lámparas WiZ que respondan, con su IP y estado actual. Hacé clic
en una para seleccionarla (queda guardada para la próxima vez).

Si el escaneo no encuentra nada (pasa en redes con "aislamiento de clientes",
típico en oficinas o WiFi de invitados), podés poner la IP a mano:

- **App oficial WiZ:** tocá la lámpara → ajustes → información del dispositivo
- **Router:** entrá al panel (`192.168.1.1` o `192.168.0.1`) y buscá un
  dispositivo cuyo nombre empiece con `wiz_`

> **Importante:** la PC y la lámpara tienen que estar en la **misma red**
> (no funciona si una está en una red de invitados y la otra en la principal).

## Cómo funciona

Las lámparas WiZ escuchan comandos UDP en el puerto **38899** en formato JSON,
por ejemplo: `{"method":"setPilot","params":{"state":true,"dimming":80}}`.

`server.py` arma esos mensajes y los manda directo a la IP de la lámpara.
`static/index.html` es la interfaz que ves en el navegador y llama al servidor
por HTTP.

## Tecnologías

- **Python 3** + **Flask** — servidor HTTP
- **UDP** — comunicación directa con la lámpara
- **HTML + CSS + JS** (sin frameworks) — interfaz web

## Licencia

MIT
