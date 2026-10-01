document.addEventListener('DOMContentLoaded', () => {
    let currentAudio = null;
    let currentlyPlayingItem = null;
    let barrelClicks = 0;
    let rebootState = 0; // 0=oculto, 1=revelado, 2=limpio

    
    // ==================================================
    // EFECTO DE SONIDO ANALÃ“GICO AL PASAR EL CURSOR
    // ==================================================
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();

    // ==================================================
    // ANALIZADOR DE FRECUENCIAS (REACTIVIDAD MUSICAL)
    // ==================================================
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let reactiveNodeAttached = false;
    let lastGlitchTime = 0;

    function loopAudioReactions() {
        requestAnimationFrame(loopAudioReactions);
        if (!currentAudio || currentAudio.paused) return;

        analyser.getByteFrequencyData(dataArray);

        // Calcular promedios de graves (Kicks/Bass) (índices 0 a 10 de 128)
        let bassSum = 0;
        for (let i = 0; i < 10; i++) {
            bassSum += dataArray[i];
        }
        const bassAvg = bassSum / 10; // Valor entre 0 y 255

        if (currentlyPlayingItem) {
            // OPCIÓN 1: Latido al Ritmo (Pulse)
            // Mapear el bajo (0-255) a una escala visual y brillo
            const scale = 1 + (bassAvg / 255) * 0.08; // Hasta 1.08x de tamaño
            const glow = (bassAvg / 255) * 60; // Hasta 60px de resplandor
            const opacity = 0.5 + (bassAvg / 255) * 0.5;

            currentlyPlayingItem.style.setProperty('--beat-scale', scale);
            currentlyPlayingItem.style.setProperty('--beat-glow', glow + 'px');
            currentlyPlayingItem.style.setProperty('--beat-opacity', opacity);
        }

        // ACTUALIZACIÓN DE BARRA DE DURACIÓN EN GRID
        const progressFill = document.getElementById('grid-progress-fill');
        const progressTime = document.getElementById('grid-progress-time');
        const progressSlider = document.getElementById('grid-progress-slider');
        
        if (progressFill && progressTime && currentAudio && !isNaN(currentAudio.duration) && currentAudio.duration > 0) {
            const percent = (currentAudio.currentTime / currentAudio.duration) * 100;
            
            // Solo actualizamos la barra visual si el usuario NO la esta arrastrando
            if (!progressSlider || progressSlider.dataset.dragging !== 'true') {
                progressFill.style.width = percent + '%';
                if (progressSlider) progressSlider.value = percent;
            }
            
            const formatTime = (time) => {
                const mins = Math.floor(time / 60);
                const secs = Math.floor(time % 60).toString().padStart(2, '0');
                return mins + ':' + secs;
            };
            progressTime.innerText = formatTime(currentAudio.currentTime) + ' / ' + formatTime(currentAudio.duration);
        }

        // OPCIÓN 3: Glitch Reactivo
        // Si el bajo supera un umbral muy alto (golpe fuerte) y pasó medio segundo desde el último
        if (bassAvg > 240 && Date.now() - lastGlitchTime > 500) {
            lastGlitchTime = Date.now();
            triggerGlitch();
        }
    }
    loopAudioReactions(); // Iniciar el bucle infinito

    function setupAudioNode(audioElement) {
        // En Firefox/Chrome, crearMediaElementSource solo se puede hacer una vez por elemento HTMLMediaElement.
        // Como creamos un 'new Audio()' cada vez, está bien hacerlo por cada nuevo track.
        const source = audioCtx.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
    }

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

    allItems.forEach(el => {
        // Evento de hover y sonido analÃ³gico
        el.addEventListener('mouseenter', (e) => { e.stopPropagation();
            if (el.classList.contains('no-react')) return;
            el.classList.add('hovered');
            playHoverSound();
        });
        el.addEventListener('mouseleave', (e) => { e.stopPropagation();
            if (el.classList.contains('no-react')) return;
            el.classList.remove('hovered');
        });

        // Evento de clic para reproducir canciones
        el.addEventListener('click', (e) => { e.stopPropagation();
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
                        void popup.offsetWidth;
                        popup.classList.add('show');

                        const barIndex = parseInt(el.getAttribute('data-index')) || 1;
                        const variacion = Math.floor(Math.random() * 4) + 1;

                        window.isErrorStatic = true;
                        const albumContainer = document.querySelector('.album-container');
                        const staticCanvas = document.getElementById('channel-04-canvas');

                        if (staticCanvas) requestAnimationFrame(renderStaticNoise);

                        if (typeof playDynamicGlitch === 'function') {
                            playDynamicGlitch(2000, barIndex, variacion, albumContainer, staticCanvas);
                        }

                        if (window.errorStaticTimeout) clearTimeout(window.errorStaticTimeout);
                        window.errorStaticTimeout = setTimeout(() => {
                            window.isErrorStatic = false;
                            if (albumContainer) albumContainer.style.opacity = '';
                            if (staticCanvas) staticCanvas.style.opacity = '';
                        }, 2000);
                    }
                    return; // Bloquear completamente el clic (ni revela ni reproduce)
                }
            }
            
            // Si interactúa con cualquier otra foto, el botón de reinicio vuelve a su estado inicial
            if (typeof rebootState !== 'undefined') {
                rebootState = 0;
                const rBtn = document.querySelector('.bot-6');
                if (rBtn) { rBtn.classList.remove('show-x'); rBtn.classList.remove('stage-2'); }
            }
            
            const isRevealed = el.classList.contains('revealed');
            const externalUrl = el.getAttribute('data-url');
            
            if (!isRevealed) {
                el.classList.add('revealed');
                if (externalUrl) e.preventDefault();
            } else {
                // EXCEPCIÓN PARA BOT-5-3 (EXP. - Reveal All)
                if (el.id === 'reveal-all-trigger') {
                    const now = new Date();
                    document.querySelectorAll('.item, .sub-item').forEach(item => {
                        let isLocked = false;
                        const unlockStr = item.getAttribute('data-unlock-time');
                        if (unlockStr) {
                            if (now < new Date(unlockStr)) isLocked = true;
                        }
                        if (!isLocked && !item.classList.contains('revealed')) {
                            item.classList.add('revealed');
                        }
                    });
                    triggerGlitch();
                    return;
                }

                if (externalUrl) {
                    e.preventDefault();
                    window.open(externalUrl, '_blank');
                    return;
                }
                if (el.id === 'player-trigger') {
                    const playerModal = document.getElementById('retro-player-modal');
                    if (playerModal) {
                        // Calcular posicin exacta del cuadro para animacin
                        const modalContent = playerModal.querySelector('.retro-modal-content');
                        const rect = el.getBoundingClientRect();
                        const startX = rect.left + rect.width / 2 - window.innerWidth / 2;
                        const startY = rect.top + rect.height / 2 - window.innerHeight / 2;
                        
                        if (modalContent) {
                            modalContent.style.setProperty('--start-x', startX + 'px');
                            modalContent.style.setProperty('--start-y', startY + 'px');
                        }
                        
                        // Forzar repintado
                        void playerModal.offsetWidth;
                        
                        playerModal.classList.add('active');
                    }
                    return;
                }
                
                if (el.id === 'play-pause-trigger') {
                    const globalBtn = document.getElementById('global-play-pause');
                    if (globalBtn) globalBtn.click();
                    return;
                }
                


                if (el.id === 'barrel-trigger' || el.classList.contains('barrel-trigger')) {
                    barrelClicks++;
                    
                    const clickStage = barrelClicks % 5;

                    const getRow1 = () => Array.from(document.querySelectorAll('.row-top .item'));
                    const getRow2 = () => Array.from(document.querySelectorAll('.row-mid .item'));
                    const getRow3 = () => Array.from(document.querySelectorAll('.row-bot .item:not(.sub-container), .row-bot .sub-item'));

                    const animateWave = (elements, reverse = false) => {
                        let arr = elements;
                        if (reverse) arr = arr.slice().reverse();
                        arr.forEach((box, index) => {
                            setTimeout(() => {
                                box.classList.add('hovered');
                                setTimeout(() => box.classList.remove('hovered'), 400);
                            }, index * 100);
                        });
                    };

                    if (clickStage === 1) {
                        animateWave(getRow1(), false);
                    } else if (clickStage === 2) {
                        animateWave(getRow2(), true);
                    } else if (clickStage === 3) {
                        animateWave(getRow3(), false);
                    } else if (clickStage === 4) {
                        animateWave(getRow1(), false);
                        animateWave(getRow2(), true);
                        animateWave(getRow3(), false);
                    } else if (clickStage === 0) {
                        document.body.classList.add('do-barrel-roll');
                        setTimeout(() => {
                            document.body.classList.remove('do-barrel-roll');
                        }, 1500);
                    }
                    return;
                }
            }
            
                        // volume-trigger es una excepción: debe desplegarse simultáneamente con la revelación (primer clic)
            if (el.id === 'volume-trigger') {
                const volContainer = document.getElementById('crt-volume-container');
                if (volContainer) {
                    volContainer.classList.toggle('show');
                }
                return; // Ahora podemos hacer return porque isRevealed ya se procesó al principio del listener
            }

            const audioSrc = el.getAttribute('data-audio');
            
            if (audioSrc) {
                e.preventDefault(); // Evitar saltar a otra secciÃ³n
                
                // Si haces clic en la que ya estÃ¡ sonando, paÃºsala
                if (currentlyPlayingItem === el && currentAudio && !currentAudio.paused) {
                    currentAudio.pause();
                    el.classList.remove('playing');
                    const globalBtn = document.getElementById('global-play-pause');
                    if (globalBtn) globalBtn.innerHTML = '&#9654;'; const gridBtn = document.getElementById('grid-player-icon'); if (gridBtn) gridBtn.innerHTML = '&#9654;&#xFE0E;';
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
                currentAudio.crossOrigin = 'anonymous';
                const vSlider = document.getElementById('global-volume-slider');
                currentAudio.volume = vSlider ? parseFloat(vSlider.value) : 0.75;
                setupAudioNode(currentAudio);
                currentAudio.play();
                currentlyPlayingItem = el;
                const globalBtn = document.getElementById('global-play-pause');
                if (globalBtn) globalBtn.innerHTML = '&#10074;&#10074;'; const gridBtn = document.getElementById('grid-player-icon'); if (gridBtn) gridBtn.innerHTML = '&#10074;&#10074;';
                el.classList.add('playing');
                
                // Quitar la clase cuando termine la canciÃ³n
                                // Quitar la clase y reproducir la siguiente al terminar
                currentAudio.addEventListener('ended', () => {
                    el.classList.remove('playing');
                    currentlyPlayingItem = null;
                    const globalBtn = document.getElementById('global-play-pause');
                    if (globalBtn) globalBtn.innerHTML = '&#9654;'; 
                    const gridBtn = document.getElementById('grid-player-icon'); 
                    if (gridBtn) gridBtn.innerHTML = '&#9654;&#xFE0E;';
                    
                    // AUTOPLAY: Seleccionar y reproducir siguiente pista aleatoria
                    const allMusicItems = Array.from(document.querySelectorAll('.item[data-audio], .sub-item[data-audio]'));
                    if (allMusicItems.length > 0) {
                        const nextOptions = allMusicItems.filter(item => item !== el);
                        const pool = nextOptions.length > 0 ? nextOptions : allMusicItems;
                        const randomIndex = Math.floor(Math.random() * pool.length);
                        const nextItem = pool[randomIndex];
                        
                        setTimeout(() => {
                            nextItem.click();
                        }, 500);
                    }
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
                    globalPlayPauseBtn.innerHTML = '&#9654;'; const gridBtn = document.getElementById('grid-player-icon'); if (gridBtn) gridBtn.innerHTML = '&#9654;&#xFE0E;';
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
                // PRIMER CLIC: Revelar foto Y mostrar la X roja inmediatamente
                rebootBtn.classList.add('revealed');
                rebootBtn.classList.add('show-x');
                rebootState = 1;
                
            } else if (rebootState === 1) {
                // SEGUNDO CLIC: Pausar musica, ocultar demas imagenes, y hacer Barrel Roll (cambio de color) a la X
                if (currentAudio && !currentAudio.paused) {
                    currentAudio.pause();
                }
                const globalBtn = document.getElementById('global-play-pause');
                if (globalBtn) globalBtn.innerHTML = '&#9654;'; const gridBtn = document.getElementById('grid-player-icon'); if (gridBtn) gridBtn.innerHTML = '&#9654;&#xFE0E;';
                
                if (currentlyPlayingItem) {
                    currentlyPlayingItem.classList.remove('playing');
                    currentlyPlayingItem = null;
                }
                
                // Ocultar todas las imagenes reveladas EXCEPTO el boton de reinicio
                document.querySelectorAll('.revealed').forEach(el => {
                    if (el !== rebootBtn) el.classList.remove('revealed');
                });
                
                // Activar la nueva etapa (animacion barrel roll y cyan)
                rebootBtn.classList.add('stage-2');
                
                rebootState = 2;
                
            } else if (rebootState === 2) {
                // TERCER CLIC: Reiniciar pagina (volver a la terminal)
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
                rebootBtn.classList.remove('stage-2');
                
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
    // Control de barra de progreso interactivo (Click + Drag)
    const durationSlider = document.getElementById('grid-progress-slider');
    const gridProgressFill = document.getElementById('grid-progress-fill');
    
    if (durationSlider) {
        durationSlider.addEventListener('click', (e) => e.stopPropagation());
        durationSlider.addEventListener('mousedown', () => { durationSlider.dataset.dragging = 'true'; });
        durationSlider.addEventListener('touchstart', () => { durationSlider.dataset.dragging = 'true'; }, {passive: true});
        
        durationSlider.addEventListener('input', (e) => {
            if (gridProgressFill) gridProgressFill.style.width = e.target.value + '%';
        });

        const applySeek = (e) => {
            durationSlider.dataset.dragging = 'false';
            if (currentAudio && !isNaN(currentAudio.duration) && currentAudio.duration > 0) {
                currentAudio.currentTime = (parseFloat(e.target.value) / 100) * currentAudio.duration;
            }
        };
        durationSlider.addEventListener('mouseup', applySeek);
        durationSlider.addEventListener('touchend', applySeek);
    }

    // Funcionalidad CRT Volume Overlay
    const renderVolumeBars = (val) => {
        const barsContainer = document.getElementById('vol-bars-display');
        if (!barsContainer) return;
        barsContainer.innerHTML = '';
        const totalBars = 50; // Muchisimos mas bloques para que sean delgados
        const activeBars = Math.round(val * totalBars);
        for (let i = 0; i < totalBars; i++) {
            const el = document.createElement('div');
            if (i < activeBars) {
                el.className = 'vol-block';
            } else {
                el.className = 'vol-dot';
            }
            barsContainer.appendChild(el);
        }
    };

    const crtVolSlider = document.getElementById('global-volume-slider');
    if (crtVolSlider) {
        renderVolumeBars(parseFloat(crtVolSlider.value));
        crtVolSlider.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            if (currentAudio) currentAudio.volume = v;
            renderVolumeBars(v);
        });
    }


    // ==================================================
    // CAMBIO DE CANAL (CH 05 -> CH 04 -> CH 03)
    // ==================================================
    const channelIndicator = document.getElementById('crt-channel-indicator');
    const staticCanvas = document.getElementById('channel-04-canvas');
    const rpgScreen = document.getElementById('channel-03-rpg');
    
    let currentChannel = 5;
    let staticCtx;
    

    if (channelIndicator && staticCanvas) {
        staticCanvas.width = 300;
        staticCanvas.height = 200;
        staticCtx = staticCanvas.getContext('2d', { alpha: false });

        function renderStaticNoise() {
            if (currentChannel !== 4 && !window.isErrorStatic) return; 
            const w = staticCanvas.width;
            const h = staticCanvas.height;
            const imgData = staticCtx.createImageData(w, h);
            const buffer32 = new Uint32Array(imgData.data.buffer);
            for (let i = 0; i < buffer32.length; i++) {
                const v = Math.random() * 255 | 0; 
                buffer32[i] = (255 << 24) | (v << 16) | (v << 8) | v;
            }
            staticCtx.putImageData(imgData, 0, 0);
            requestAnimationFrame(renderStaticNoise);
        }
        


        channelIndicator.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentChannel === 5) {
                // CH 05 -> CH 04 (Estatica)
                currentChannel = 4;
                channelIndicator.innerText = 'CH 04';
                if (window.dynamicGlitchVisualId) {
                    cancelAnimationFrame(window.dynamicGlitchVisualId);
                    window.dynamicGlitchVisualId = null;
                }
                const albumC = document.querySelector('.album-container');
                if (albumC) albumC.style.opacity = '';
                staticCanvas.style.opacity = '';
                staticCanvas.style.mixBlendMode = 'normal'; // Forzar opaco 100%
                staticCanvas.classList.add('active');
                requestAnimationFrame(renderStaticNoise);
                if (currentAudio) currentAudio.pause();
                triggerGlitch();
                if (typeof playSimpleWhiteNoise === 'function') playSimpleWhiteNoise(0, 0.12);
            } else if (currentChannel === 4) {
                // CH 04 -> CH 03 (RPG Map)
                currentChannel = 3;
                channelIndicator.innerText = 'CH 03';
                staticCanvas.classList.remove('active');
                if (rpgScreen) rpgScreen.classList.add('active');
                triggerGlitch();
                if (typeof stopContinuousWhiteNoise === 'function') stopContinuousWhiteNoise();
            } else {
                // CH 03 -> CH 05 (Grilla Musical)
                currentChannel = 5;
                channelIndicator.innerText = 'CH 05';
                if (rpgScreen) rpgScreen.classList.remove('active');
                triggerGlitch();
                if (typeof stopContinuousWhiteNoise === 'function') stopContinuousWhiteNoise();
            }
        });
    }
});














// --- GENERADOR DINAMICO DE ESTATICA (AUDIO + VISUAL) ---
window.audioCtx = null;
function playDynamicGlitch(durationMs, barIndex, variation, albumContainer, staticCanvas) {
    if (!window.audioCtx) {
        window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (window.audioCtx.state === 'suspended') window.audioCtx.resume();
    
    // Generador pseudo-aleatorio para que la variacion sea siempre identica para el mismo candado y version
    let seed = barIndex * 100 + variation;
    function seededRandom() {
        let x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }
    
    // Crear mapa de picos de estatica
    const numFlashes = Math.floor(seededRandom() * 4) + 3; // 3 a 6 flashes
    let points = [{t: 0, v: 0}];
    let currentTime = 0.05;
    
    for (let i=0; i<numFlashes; i++) {
        let flashStart = currentTime + seededRandom() * 0.1;
        let flashPeak = flashStart + seededRandom() * 0.05;
        let flashEnd = flashPeak + seededRandom() * 0.2 + 0.05;
        let intensity = seededRandom() * 0.5 + 0.4; // 0.4 a 0.9
        
        if (flashStart >= 0.95) break;
        if (flashEnd >= 0.95) flashEnd = 0.95;
        
        points.push({t: flashStart, v: 0});
        points.push({t: flashPeak, v: intensity});
        points.push({t: flashEnd, v: 0});
        currentTime = flashEnd;
    }
    points.push({t: 1.0, v: 0});

    // 1. Iniciar Animacion Visual con requestAnimationFrame
    const startTime = performance.now();
    function animateVisuals(now) {
        let elapsed = now - startTime;
        let progress = elapsed / durationMs;
        if (progress > 1) progress = 1;
        
        // Encontrar valor de intensidad interpolando los puntos
        let currentIntensity = 0;
        for (let i = 0; i < points.length - 1; i++) {
            if (progress >= points[i].t && progress <= points[i+1].t) {
                let range = points[i+1].t - points[i].t;
                let pct = (progress - points[i].t) / range;
                currentIntensity = points[i].v + (points[i+1].v - points[i].v) * pct;
                break;
            }
        }
        
        if (staticCanvas) {
            staticCanvas.style.opacity = currentIntensity;
            staticCanvas.style.mixBlendMode = 'screen';
        }
        if (albumContainer) {
            // El fondo se oscurece inversamente a la estatica (0.05 de opacidad minima cuando intensidad es 0.9)
            let baseDrop = 1.0 - currentIntensity;
            if (baseDrop < 0.05) baseDrop = 0.05;
            albumContainer.style.opacity = baseDrop;
        }
        
        if (progress < 1) {
            window.dynamicGlitchVisualId = requestAnimationFrame(animateVisuals);
        } else {
            window.dynamicGlitchVisualId = null;
        }
    }
    if (window.dynamicGlitchVisualId) cancelAnimationFrame(window.dynamicGlitchVisualId);
    window.dynamicGlitchVisualId = requestAnimationFrame(animateVisuals);

    // 2. Iniciar Audio
    const bufferSize = window.audioCtx.sampleRate * (durationMs / 1000); 
    const buffer = window.audioCtx.createBuffer(1, bufferSize, window.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1; 

    const noiseSource = window.audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    
    const gainNode = window.audioCtx.createGain();
    const audioNow = window.audioCtx.currentTime;
    const dur = durationMs / 1000;
    const masterVol = 0.15; 
    
    gainNode.gain.setValueAtTime(0, audioNow);
    points.forEach(p => {
        gainNode.gain.linearRampToValueAtTime(p.v * masterVol, audioNow + dur * p.t);
    });

    noiseSource.connect(gainNode);
    gainNode.connect(window.audioCtx.destination);
    noiseSource.start(audioNow);
    
    setTimeout(() => {
        noiseSource.stop();
        noiseSource.disconnect();
        gainNode.disconnect();
    }, durationMs + 100);
}

// --- GENERADOR DE RUIDO BLANCO CONTINUO Y RAFAGAS CORTAS ---
window.continuousNoiseSource = null;
window.continuousGainNode = null;

function playSimpleWhiteNoise(durationMs, volume) {
    if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (window.audioCtx.state === 'suspended') window.audioCtx.resume();
    
    // Continuo
    if (durationMs === 0) {
        if (window.continuousNoiseSource) return; 
        const bufferSize = window.audioCtx.sampleRate * 2; 
        const buffer = window.audioCtx.createBuffer(1, bufferSize, window.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        
        window.continuousNoiseSource = window.audioCtx.createBufferSource();
        window.continuousNoiseSource.buffer = buffer;
        window.continuousNoiseSource.loop = true;
        
        window.continuousGainNode = window.audioCtx.createGain();
        window.continuousGainNode.gain.value = volume || 0.1;
        
        window.continuousNoiseSource.connect(window.continuousGainNode);
        window.continuousGainNode.connect(window.audioCtx.destination);
        window.continuousNoiseSource.start();
        return;
    }
    
    // Rafaga (Burst)
    const bufferSize = window.audioCtx.sampleRate * (durationMs / 1000); 
    const buffer = window.audioCtx.createBuffer(1, bufferSize, window.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    
    const noiseSource = window.audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    
    const gainNode = window.audioCtx.createGain();
    const audioNow = window.audioCtx.currentTime;
    const dur = durationMs / 1000;
    
    gainNode.gain.setValueAtTime(0, audioNow);
    gainNode.gain.linearRampToValueAtTime(volume || 0.15, audioNow + dur * 0.1);
    gainNode.gain.setValueAtTime(volume || 0.15, audioNow + dur * 0.8);
    gainNode.gain.linearRampToValueAtTime(0, audioNow + dur);

    noiseSource.connect(gainNode);
    gainNode.connect(window.audioCtx.destination);
    noiseSource.start(audioNow);
    
    setTimeout(() => {
        noiseSource.stop();
        noiseSource.disconnect();
        gainNode.disconnect();
    }, durationMs + 100);
}

function stopContinuousWhiteNoise() {
    if (window.continuousNoiseSource && window.audioCtx) {
        const audioNow = window.audioCtx.currentTime;
        window.continuousGainNode.gain.linearRampToValueAtTime(0, audioNow + 0.1);
        setTimeout(() => {
            if(window.continuousNoiseSource) {
                window.continuousNoiseSource.stop();
                window.continuousNoiseSource.disconnect();
                window.continuousNoiseSource = null;
            }
        }, 150);
    }
}




