# Guía Paso a Paso: Cómo usar ngrok en Fútbol Career Mode

Esta guía explica de forma muy sencilla cómo exponer tu servidor local (`http://localhost:3000`) a internet usando **ngrok**. 

Esto te permitirá probar la aplicación en tu celular, tablet o cualquier otro dispositivo conectado a internet, lo cual es **indispensable para usar la cámara de fotos**, ya que los navegadores exigen una conexión segura **HTTPS** para habilitar la cámara.

---

## 📋 Requisitos Previos

1. Tener tu servidor de desarrollo corriendo (`npm run dev`).
2. Tener una cuenta en [ngrok.com](https://ngrok.com/) y obtener tu token de autenticación (Authtoken).

---

## 🚀 Paso a Paso (Para Dummies)

### Paso 1: Encender el proyecto
Asegúrate de que tu proyecto de Next.js está corriendo en tu computadora. Deberías poder abrir `http://localhost:3000` en tu navegador.

```bash
npm run dev
```

### Paso 2: Abrir una nueva terminal
No cierres la terminal donde está corriendo el proyecto. Abre una ventana de terminal nueva en la carpeta raíz del proyecto.

### Paso 3: Registrar tu token de ngrok (Solo se hace una vez)
Copia tu authtoken desde el panel de ngrok y ejecútalo en la nueva terminal usando el siguiente comando (este comando guarda el token en tu computadora para siempre):

```bash
npx ngrok config add-authtoken TU_TOKEN_DE_NGROK
```
*(Reemplaza `TU_TOKEN_DE_NGROK` por tu token real).*

### Paso 4: Iniciar el túnel
Ejecuta el comando para crear el puente entre internet y tu puerto 3000:

```bash
npx ngrok http 3000
```

### Paso 5: Copiar la URL y probar en el celular
Verás una pantalla en tu terminal con información del túnel. Busca la línea que dice **Forwarding**:

```text
Forwarding     https://xxxx-xxxx-xxxx.ngrok-free.dev -> http://localhost:3000
```

*   **¡Esa URL que empieza con `https://` es tu link mágico!**
*   Cópiala y envíatela al celular (por WhatsApp, email, etc.).
*   Ábrela en tu celular y listo: ya puedes navegar e interactuar con la app de tu computadora. ¡Incluso puedes usar la cámara de fotos!

---

## 🛠️ Errores Comunes y Soluciones

### 1. Error `ERR_NGROK_334` (El endpoint ya está online)
**Qué significa:** Ya hay un proceso de ngrok corriendo en tu computadora usando esa misma cuenta.
**Cómo solucionarlo:**
*   Busca si tienes otra terminal abierta ejecutando ngrok y ciérrala (presiona `Ctrl + C`).
*   Si estás usando un editor (como VS Code) y la terminal se quedó colgada en segundo plano, puedes cerrar a la fuerza los procesos de ngrok escribiendo en la terminal:
    *   **En Windows (PowerShell):**
        ```powershell
        Stop-Process -Name "ngrok" -Force
        ```
    *   **En macOS/Linux:**
        ```bash
        killall ngrok
        ```
*   Una vez cerrado el proceso anterior, vuelve a ejecutar `npx ngrok http 3000`.

### 2. Mensaje en el celular: "No se puede acceder a la cámara"
**Cómo solucionarlo:**
*   Asegúrate de haber abierto el enlace que empieza con **`https://`** (con la **S** al final). Si usas `http://`, el navegador del celular bloqueará la cámara por seguridad.

### 3. Error: "Invalid Host Header" o "CSRF Block" al enviar formularios
**Por qué pasa:** Next.js bloquea conexiones externas por seguridad para prevenir ataques.
**Cómo se solucionó en este proyecto:**
*   Ya configuramos el archivo `next.config.ts` para permitir conexiones de subdominios `*.ngrok-free.dev` y `*.ngrok.io`. No deberías tener este problema aquí.
