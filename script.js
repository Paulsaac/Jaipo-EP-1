document.addEventListener('DOMContentLoaded', () => {
    
    // Hover independiente para cada elemento
    const allItems = document.querySelectorAll('.item');
    allItems.forEach(el => {
        el.addEventListener('mouseenter', () => el.classList.add('hovered'));
        el.addEventListener('mouseleave', () => el.classList.remove('hovered'));
    });

    // Elementos del sistema
    const startupScreen = document.getElementById('startup-screen');
    const crtScreen = document.querySelector('.crt-screen');
    const container = document.querySelector('.album-container');
    const staticOverlay = document.querySelector('.static-overlay');

    // ==================================================
    // FIX PARA EL EFECTO ACUOSO (Acelerado por JS a 60FPS)
    // ==================================================
    const waterOffset = document.getElementById('water-offset');
    let waterAngle = 0;
    
    function animateWater() {
        waterAngle += 0.06; // Velocidad del movimiento aumentada (4x más rápido)
        // Movimiento circular continuo y ultra suave
        const dx = Math.sin(waterAngle) * 25; 
        const dy = Math.cos(waterAngle) * 20; 
        
        if (waterOffset) {
            waterOffset.setAttribute('dx', dx);
            waterOffset.setAttribute('dy', dy);
        }
        requestAnimationFrame(animateWater);
    }
    animateWater();

    // ==================================================
    // LÓGICA DE INICIO Y PANTALLA COMPLETA
    // ==================================================
    const startExperience = () => {
        // Evita que se dispare múltiples veces
        if (startupScreen.classList.contains('turning-off') || startupScreen.style.display === 'none') return;

        // 1. Iniciar pantalla completa
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn("No se pudo iniciar pantalla completa: ", err);
            });
        }

        // 2. Ejecutar la animación de encogimiento a un punto en la terminal
        startupScreen.classList.add('turning-off');

        // 3. Esperar que termine la animación (400ms) para encender la TV principal
        setTimeout(() => {
            startupScreen.style.display = 'none';
            crtScreen.classList.add('turned-on');

            // 4. Empezar con los glitches aleatorios luego de unos segundos
            setTimeout(triggerGlitch, 5000 + Math.random() * 5000);
        }, 400);
    };

    // Funciona con clic
    startupScreen.addEventListener('click', startExperience);
    
    // Funciona con CUALQUIER tecla
    document.addEventListener('keydown', () => {
        if (startupScreen.style.display !== 'none') {
            startExperience();
        }
    });

    // ==================================================
    // LÓGICA DE DISTORSIÓN (GLITCH) NATURAL
    // ==================================================
    function triggerGlitch() {
        const glitchType = Math.floor(Math.random() * 6) + 1;
        
        container.classList.add(`glitch-effect-${glitchType}`);
        staticOverlay.classList.add(`static-flash-${glitchType}`);
        
        setTimeout(() => {
            container.classList.remove(`glitch-effect-${glitchType}`);
            staticOverlay.classList.remove(`static-flash-${glitchType}`);
        }, 200);

        const intervals = [10000, 15000, 25000];
        const nextInterval = intervals[Math.floor(Math.random() * intervals.length)];
        
        setTimeout(triggerGlitch, nextInterval);
    }
});
