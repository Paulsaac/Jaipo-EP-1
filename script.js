document.addEventListener('DOMContentLoaded', () => {
    let rebootState = 0; // 0=oculto, 1=revelado, 2=limpio

    
    // ==================================================
    // EFECTO DE SONIDO ANALÃ“GICO AL PASAR EL CURSOR
    // ==================================================
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();

    function playHoverSound() {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        // Crear un sonido sintÃ©tico corto (clic/blip mecÃ¡nico retro)
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime); // Tono bajo
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.04);
        
        // Volumen bajo y decaimiento rÃ¡pido
        gainNode.gain.setValueAtTime(0.03, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.04);
    }

    // Hover independiente para cada elemento y sonido
    const allItems = document.querySelectorAll('.item, .sub-item');
    
    let currentAudio = null;
    let currentlyPlayingItem = null;

    allItems.forEach(el => {
        // Evento de hover y sonido analÃ³gico
        el.addEventListener('mouseenter', () => {
            if (el.classList.contains('no-react')) return;
            el.classList.add('hovered');
            playHoverSound();
        });
        el.addEventListener('mouseleave', () => {
            if (el.classList.contains('no-react')) return;
            el.classList.remove('hovered');
        });

        // Evento de clic para reproducir canciones
        el.addEventListener('click', (e) => {
            if (el.classList.contains('no-react')) return;
            
            // --- VERIFICAR FECHA DE DESBLOQUEO ---
            const unlockTimeStr = el.getAttribute('data-unlock-time');
            if (unlockTimeStr) {
                const unlockTime = new Date(unlockTimeStr);
                const now = new Date();
                if (now < unlockTime) {
                    e.preventDefault();
                    
                    // Mostrar el popup de bloqueo
                    const popup = document.getElementById('locked-popup');
                    if (popup) {
                        popup.classList.remove('show');
                        void popup.offsetWidth; // Trigger reflow para reiniciar la animacin
                        popup.classList.add('show');
                    }
                    return; // Bloquear completamente el clic (ni revela ni reproduce)
                }
            }
            
            // Si interactúa con cualquier otra foto, el botón de reinicio vuelve a su estado inicial
            if (typeof rebootState !== 'undefined') {
                rebootState = 0;
                const rBtn = document.querySelector('.bot-6');
                if (rBtn) rBtn.classList.remove('show-x');
            }
            
            const isRevealed = el.classList.contains('revealed');
            const externalUrl = el.getAttribute('data-url');
            
            if (!isRevealed) {
                el.classList.add('revealed');
                if (externalUrl) e.preventDefault();
            } else {
                if (externalUrl) {
                    e.preventDefault();
                    window.open(externalUrl, '_blank');
                    return;
                }
                if (el.id === 'player-trigger') {
                    const playerModal = document.getElementById('retro-player-modal');
                    if (playerModal) playerModal.classList.add('active');
                    return;
                }
                
                if (el.id === 'play-pause-trigger') {
                    const globalBtn = document.getElementById('global-play-pause');
                    if (globalBtn) globalBtn.click();
                    return;
                }
                
                if (el.id === 'barrel-trigger') {
                    document.body.classList.add('do-barrel-roll');
                    setTimeout(() => {
                        document.body.classList.remove('do-barrel-roll');
                    }, 1500);
                    return;
                }
            }
            
            const audioSrc = el.getAttribute('data-audio');
            
            if (audioSrc) {
                e.preventDefault(); // Evitar saltar a otra secciÃ³n
                
                // Si haces clic en la que ya estÃ¡ sonando, paÃºsala
                if (currentlyPlayingItem === el && currentAudio && !currentAudio.paused) {
                    currentAudio.pause();
                    el.classList.remove('playing');
                    const globalBtn = document.getElementById('global-play-pause');
                    if (globalBtn) globalBtn.innerHTML = '&#9654;'; const gridBtn = document.getElementById('grid-player-icon'); if (gridBtn) gridBtn.innerHTML = '&#9654;';
                    return;
                }

                // Pausar la canciÃ³n anterior si habÃ­a otra sonando
                if (currentAudio) {
                    currentAudio.pause();
                }
                if (currentlyPlayingItem) {
                    currentlyPlayingItem.classList.remove('playing');
                }

                // Reproducir la nueva canciÃ³n
                currentAudio = new Audio(audioSrc);
                currentAudio.play();
                currentlyPlayingItem = el;
                const globalBtn = document.getElementById('global-play-pause');
                if (globalBtn) globalBtn.innerHTML = '&#10074;&#10074;'; const gridBtn = document.getElementById('grid-player-icon'); if (gridBtn) gridBtn.innerHTML = '&#10074;&#10074;';
                el.classList.add('playing');
                
                // Quitar la clase cuando termine la canciÃ³n
                currentAudio.addEventListener('ended', () => {
                    el.classList.remove('playing');
                    currentlyPlayingItem = null;
                    const globalBtn = document.getElementById('global-play-pause');
                    if (globalBtn) globalBtn.innerHTML = '&#9654;'; const gridBtn = document.getElementById('grid-player-icon'); if (gridBtn) gridBtn.innerHTML = '&#9654;';
                });
            }
        });
    });

    // Elementos del sistema
    const startupScreen = document.getElementById('startup-screen');

    // Animar encendido inicial de la terminal
    startupScreen.classList.add('turning-on');
    setTimeout(() => { startupScreen.classList.remove('turning-on'); }, 400);
    const crtScreen = document.querySelector('.crt-screen');
    const container = document.querySelector('.album-container');
    const staticOverlay = document.querySelector('.static-overlay');

    // ==================================================
    // FIX PARA EL EFECTO ACUOSO (Acelerado por JS a 60FPS)
    // ==================================================
    const waterOffset = document.getElementById('water-offset');
    let waterAngle = 0;
    
    function animateWater() {
        waterAngle += 0.01; // Velocidad a la mitad
        // Movimiento circular continuo y ultra suave
        const dx = Math.sin(waterAngle) * 12.5; 
        const dy = Math.cos(waterAngle) * 10; 
        
        if (waterOffset) {
            waterOffset.setAttribute('dx', dx);
            waterOffset.setAttribute('dy', dy);
        }
        requestAnimationFrame(animateWater);
    }
    animateWater();

    // ==================================================
    // LÃ“GICA DE INICIO Y PANTALLA COMPLETA
    // ==================================================
    const startExperience = () => {
        // Evita que se dispare mÃºltiples veces
        if (startupScreen.classList.contains('turning-off') || startupScreen.style.display === 'none') return;

        // 1. Iniciar pantalla completa (Compatible con iOS/Safari móvil)
        try {
            // Desactivar forzado de pantalla completa en celulares para evitar bugs de renderizado
            if (window.innerWidth > 768 && !document.fullscreenElement) {
                const el = document.documentElement;
                if (el.requestFullscreen) {
                    el.requestFullscreen().catch(err => console.warn(err));
                } else if (el.webkitRequestFullscreen) {
                    el.webkitRequestFullscreen();
                }
            }
        } catch(e) { console.warn(e); }

        // 2. Ejecutar la animaciÃ³n de encogimiento a un punto en la terminal
        startupScreen.classList.add('turning-off');

        // 3. Esperar que termine la animaciÃ³n (400ms) para encender la TV principal
        setTimeout(() => {
            startupScreen.style.display = 'none';
            crtScreen.classList.add('turned-on');

            // Efecto tutorial: desplegar la primera barra brevemente (solo color)
            setTimeout(() => {
                const box1 = document.querySelector('.top-1');
                if (box1) {
                    box1.classList.add('hovered');
                    if (typeof playHoverSound === 'function') playHoverSound();
                    setTimeout(() => {
                        box1.classList.remove('hovered');
                    }, 800); // Muy breve, solo 800ms
                }
            }, 800);

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
    // LÃ“GICA DE DISTORSIÃ“N (GLITCH) NATURAL
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

    // ==================================================
    // LÓGICA DEL REPRODUCTOR RETRO (MODAL)
    // ==================================================
    const playerTrigger = document.getElementById('player-trigger');
    const playerModal = document.getElementById('retro-player-modal');
    const closePlayerBtn = document.getElementById('close-player');
    const playlistItems = document.querySelectorAll('.retro-playlist li');



    if (closePlayerBtn) {
        closePlayerBtn.addEventListener('click', () => {
            if (playerModal) playerModal.classList.remove('active');
        });
    }

    // Sincronizar clics del modal con las fotos reales
    playlistItems.forEach(li => {
        li.addEventListener('click', () => {
            const targetSelector = li.getAttribute('data-target');
            const targetEl = document.querySelector(targetSelector);
            
            if (targetEl) {
                targetEl.click(); // Simula el clic en la barra
                
                // Actualizar UI del modal
                playlistItems.forEach(i => i.classList.remove('active-track'));
                li.classList.add('active-track');
            }
        });
    });

    if (playerModal) {
        playerModal.addEventListener('click', (e) => {
            if (e.target === playerModal) {
                playerModal.classList.remove('active');
            }
        });
    }

    // Control de Pausa/Reproducción Global
    const globalPlayPauseBtn = document.getElementById('global-play-pause');
    if (globalPlayPauseBtn) {
        globalPlayPauseBtn.addEventListener('click', () => {
            if (currentAudio) {
                if (currentAudio.paused) {
                    currentAudio.play();
                    globalPlayPauseBtn.innerHTML = '&#10074;&#10074;'; const gridBtn = document.getElementById('grid-player-icon'); if (gridBtn) gridBtn.innerHTML = '&#10074;&#10074;';
                    if (currentlyPlayingItem) currentlyPlayingItem.classList.add('playing');
                } else {
                    currentAudio.pause();
                    globalPlayPauseBtn.innerHTML = '&#9654;'; const gridBtn = document.getElementById('grid-player-icon'); if (gridBtn) gridBtn.innerHTML = '&#9654;';
                    if (currentlyPlayingItem) currentlyPlayingItem.classList.remove('playing');
                }
            } else {
                // Si no hay canción sonando, reproducir la primera de la lista
                const firstTrack = document.querySelector('.retro-playlist li');
                if (firstTrack) firstTrack.click();
            }
        });
    }

    // ==================================================
    // LÓGICA DE REINICIO SECUENCIAL (BOT-6)
    // ==================================================
    const rebootBtn = document.querySelector('.bot-6');
    
    if (rebootBtn) {
        rebootBtn.classList.add('no-react');
        rebootBtn.style.cursor = 'pointer';

        rebootBtn.addEventListener('click', () => {
            if (rebootState === 0) {
                // PRIMER CLIC: Solo revelar su propia foto
                rebootBtn.classList.add('revealed');
                rebootState = 1;
                
            } else if (rebootState === 1) {
                // SEGUNDO CLIC: Pausar música y ocultar todas las DEMAÁ imágenes
                if (currentAudio && !currentAudio.paused) {
                    currentAudio.pause();
                }
                const globalBtn = document.getElementById('global-play-pause');
                if (globalBtn) globalBtn.innerHTML = '&#9654;'; const gridBtn = document.getElementById('grid-player-icon'); if (gridBtn) gridBtn.innerHTML = '&#9654;';
                
                if (currentlyPlayingItem) {
                    currentlyPlayingItem.classList.remove('playing');
                    currentlyPlayingItem = null;
                }
                
                // Ocultar todas las imágenes reveladas EXCEPTO el botón de reinicio
                document.querySelectorAll('.revealed').forEach(el => {
                    if (el !== rebootBtn) el.classList.remove('revealed');
                });
                
                rebootBtn.classList.add('show-x');
                
                rebootState = 2;
                
            } else if (rebootState === 2) {
                // TERCER CLIC: Reiniciar página (volver a la terminal)
                rebootState = 0;
                
                // Salir de pantalla completa (Compatible con iOS/Safari móvil)
                try {
                    if (document.fullscreenElement || document.webkitFullscreenElement) {
                        if (document.exitFullscreen) {
                            document.exitFullscreen().catch(err => console.warn(err));
                        } else if (document.webkitExitFullscreen) {
                            document.webkitExitFullscreen();
                        }
                    }
                } catch(e) { console.warn(e); }
                
                // Remover revelado de sí mismo para el siguiente ciclo
                rebootBtn.classList.remove('revealed');
                rebootBtn.classList.remove('show-x');
                
                // Cerrar modal si estaba abierto
                const playerModal = document.getElementById('retro-player-modal');
                if (playerModal) playerModal.classList.remove('active');
                
                const startupScreen = document.getElementById('startup-screen');
                const crtScreen = document.querySelector('.crt-screen');
                
                // 1. Apagar la TV (se encoge con animación CRT)
                crtScreen.classList.remove('turned-on');
                crtScreen.classList.add('turning-off');
                
                // 2. Tras 400ms, expandir la terminal
                setTimeout(() => {
                    crtScreen.classList.remove('turning-off');
                    startupScreen.style.display = 'flex';
                    startupScreen.classList.remove('turning-off');
                    startupScreen.classList.add('turning-on');
                    
                    setTimeout(() => {
                        startupScreen.classList.remove('turning-on');
                    }, 400);
                }, 400);
            }
        });
    }
});



























