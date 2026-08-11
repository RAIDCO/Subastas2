// Cliente Socket.io para pujas en tiempo real en la página de detalle de subasta.
// Este script se carga cuando la subasta está activa o programada.

(function () {
    "use strict";

    //====================================
    // ELEMENTOS DEL DOM
    //====================================

    const subastaId = document.getElementById("subasta-id").value;
    const cronometroEl = document.getElementById("cronometro");
    const cronometroGeneralEl = document.getElementById("cronometro-general");
    const precioActualEl = document.getElementById("precio-actual");
    const montoPujaInput = document.getElementById("monto-puja");
    const btnPujar = document.getElementById("btn-pujar");
    const listaPujasEl = document.getElementById("lista-pujas");
    const alertaError = document.getElementById("alerta-puja-error");
    const mensajeError = document.getElementById("mensaje-puja-error");
    const alertaExito = document.getElementById("alerta-puja-exito");
    const pujaMinima = document.getElementById("puja-minima");

    let precioActual = Number(document.getElementById("subasta-precio-actual").value);

    //====================================
    // UTILIDADES DE FORMATO
    //====================================

    const formatearMonto = (valor) => {
        return "$" + Number(valor).toLocaleString("es-MX", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const formatearTiempo = (segundos) => {
        if (segundos <= 0) return "00:00";
        const min = Math.floor(segundos / 60);
        const seg = segundos % 60;
        return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
    };

    const formatearTiempoLargo = (ms) => {
        if (!ms || ms <= 0) return "00:00:00";
        const totalSegundos = Math.floor(ms / 1000);
        const dias = Math.floor(totalSegundos / 86400);
        const horas = Math.floor((totalSegundos % 86400) / 3600);
        const minutos = Math.floor((totalSegundos % 3600) / 60);
        const segundos = totalSegundos % 60;

        const hh = String(horas).padStart(2, "0");
        const mm = String(minutos).padStart(2, "0");
        const ss = String(segundos).padStart(2, "0");

        if (dias > 0) {
            return `${dias}d ${hh}:${mm}:${ss}`;
        }
        return `${hh}:${mm}:${ss}`;
    };

    const formatearHora = (fecha) => {
        const d = new Date(fecha);
        return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    };

    //====================================
    // TEMPORIZADOR DEL TIEMPO TOTAL DE LA SUBASTA
    //====================================

    const fechaFinVal = document.getElementById("subasta-fecha-fin") ? document.getElementById("subasta-fecha-fin").value : null;

    let timerGeneralInterval = null;

    const actualizarCronometroGeneral = () => {
        if (!cronometroGeneralEl || !fechaFinVal) return;
        const msRestantes = new Date(fechaFinVal).getTime() - Date.now();
        cronometroGeneralEl.textContent = formatearTiempoLargo(msRestantes);
    };

    if (fechaFinVal && cronometroGeneralEl) {
        actualizarCronometroGeneral();
        timerGeneralInterval = setInterval(actualizarCronometroGeneral, 1000);
    }

    //====================================
    // ACTUALIZAR PUJA MÍNIMA
    //====================================

    const actualizarPujaMinima = () => {
        const minima = Math.round(precioActual * 1.05 * 100) / 100;
        if (pujaMinima) {
            pujaMinima.textContent = formatearMonto(minima);
        }
        if (montoPujaInput) {
            montoPujaInput.min = minima.toFixed(2);
            montoPujaInput.placeholder = formatearMonto(minima);
        }
    };

    actualizarPujaMinima();

    //====================================
    // CREAR ELEMENTO DE PUJA EN LA LISTA
    //====================================

    const crearElementoPuja = (puja) => {
        const div = document.createElement("div");
        div.className = "flex items-center justify-between bg-[#FAFAF8] rounded-xl px-4 py-3 border border-[#EBE5DC]";

        const inicial = puja.usuario ? puja.usuario.charAt(0).toUpperCase() : "?";

        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-[#FFF7ED] border border-[#FFEDD5] flex items-center justify-center text-xs font-bold text-[#C2410C]">${inicial}</div>
                <div>
                    <p class="text-sm font-semibold text-[#1A1614]">${puja.usuario || "Anónimo"}</p>
                    <p class="text-xs text-[#8A7F76]">${formatearHora(puja.fecha)}</p>
                </div>
            </div>
            <p class="text-[#D97706] font-bold">${formatearMonto(puja.monto)}</p>
        `;

        return div;
    };

    //====================================
    // CONEXIÓN A SOCKET.IO
    //====================================

    const socket = io();

    // Unirse a la sala de la subasta
    socket.emit("subasta:unirse", { subastaId });

    const estadoEfectivoEl = document.getElementById("subasta-estado-efectivo");
    const estadoEfectivo = estadoEfectivoEl ? estadoEfectivoEl.value : "";
    const fechaInicioVal = document.getElementById("subasta-fecha-inicio") ? document.getElementById("subasta-fecha-inicio").value : null;

    let timerProgramadaInterval = null;

    const iniciarTimerProgramada = (segundosIniciales) => {
        let segundos = segundosIniciales;
        if (cronometroEl) cronometroEl.textContent = formatearTiempo(segundos);

        if (timerProgramadaInterval) clearInterval(timerProgramadaInterval);

        timerProgramadaInterval = setInterval(() => {
            segundos--;
            if (segundos <= 0) {
                clearInterval(timerProgramadaInterval);
                if (cronometroEl) cronometroEl.textContent = "00:00";
                setTimeout(() => window.location.reload(), 1500);
                return;
            }
            if (cronometroEl) cronometroEl.textContent = formatearTiempo(segundos);
        }, 1000);
    };

    // Si la vista ya se cargó como programada, calcular cuenta regresiva local
    if (estadoEfectivo === "programada" && fechaInicioVal) {
        const segs = Math.max(0, Math.ceil((new Date(fechaInicioVal).getTime() - Date.now()) / 1000));
        iniciarTimerProgramada(segs);
    }

    //------------------------------------
    // ESTADO ACTUAL (al unirse)
    //------------------------------------

    socket.on("subasta:estado-actual", (datos) => {
        precioActual = datos.precioActual;
        if (precioActualEl) precioActualEl.textContent = formatearMonto(precioActual);
        actualizarPujaMinima();

        if (datos.estado === "programada") {
            if (datos.segundosParaInicio > 0) {
                iniciarTimerProgramada(datos.segundosParaInicio);
            }
        } else if (datos.estado === "activa") {
            if (timerProgramadaInterval) clearInterval(timerProgramadaInterval);
            if (cronometroEl) {
                if (datos.segundosRestantes !== null && datos.segundosRestantes !== undefined && datos.segundosRestantes > 0) {
                    cronometroEl.textContent = formatearTiempo(datos.segundosRestantes);
                } else {
                    cronometroEl.textContent = "--:--";
                }
                cronometroEl.classList.remove("text-[#DC2626]");
                cronometroEl.classList.add("text-[#D97706]");
            }
        }
    });

    //------------------------------------
    // HISTORIAL DE PUJAS (al unirse)
    //------------------------------------

    socket.on("subasta:historial-pujas", (datos) => {
        if (datos.pujas && datos.pujas.length > 0) {
            listaPujasEl.innerHTML = "";
            datos.pujas.forEach((puja) => {
                listaPujasEl.appendChild(crearElementoPuja(puja));
            });
        }
    });

    //------------------------------------
    // NUEVA PUJA (broadcast)
    //------------------------------------

    socket.on("subasta:nueva-puja", (datos) => {
        // Actualizar precio
        precioActual = datos.precioActual;
        if (precioActualEl) precioActualEl.textContent = formatearMonto(precioActual);
        actualizarPujaMinima();

        // Actualizar cronómetro de inactividad
        if (datos.segundosRestantes && cronometroEl) {
            cronometroEl.textContent = formatearTiempo(datos.segundosRestantes);
            cronometroEl.classList.remove("text-[#DC2626]");
            cronometroEl.classList.add("text-[#D97706]");
        }

        // Quitar el estado vacío si existe
        const estadoVacio = listaPujasEl.querySelector(".text-center");
        if (estadoVacio) estadoVacio.remove();

        // Agregar la puja al inicio de la lista
        const elemento = crearElementoPuja(datos);
        listaPujasEl.insertBefore(elemento, listaPujasEl.firstChild);
    });

    //------------------------------------
    // TIEMPO ACTUALIZADO (tick cada segundo)
    //------------------------------------

    socket.on("subasta:tiempo-actualizado", (datos) => {
        if (cronometroEl) {
            cronometroEl.textContent = formatearTiempo(datos.segundosRestantes);

            // Efecto de urgencia cuando queda menos de 1 minuto en inactividad
            if (datos.segundosRestantes <= 60 && datos.segundosRestantes > 0) {
                cronometroEl.classList.add("text-[#DC2626]");
                cronometroEl.classList.remove("text-[#D97706]");
            } else {
                cronometroEl.classList.remove("text-[#DC2626]");
                cronometroEl.classList.add("text-[#D97706]");
            }
        }
    });

    //------------------------------------
    // SUBASTA FINALIZADA
    //------------------------------------

    socket.on("subasta:finalizada", (datos) => {
        if (cronometroEl) {
            cronometroEl.textContent = "00:00";
            cronometroEl.classList.remove("text-[#DC2626]", "text-[#D97706]");
            cronometroEl.classList.add("text-[#ADA69E]");
        }

        if (timerGeneralInterval) clearInterval(timerGeneralInterval);
        if (cronometroGeneralEl) cronometroGeneralEl.textContent = "00:00:00";

        // Deshabilitar formulario de puja
        if (montoPujaInput) montoPujaInput.disabled = true;
        if (btnPujar) {
            btnPujar.disabled = true;
            btnPujar.textContent = "Finalizada";
            btnPujar.className = "w-full bg-[#EFECE6] text-[#ADA69E] font-bold px-6 py-3 rounded-[10px] cursor-not-allowed text-center";
        }

        // Mostrar mensaje de finalización
        const banner = document.createElement("div");
        banner.className = "bg-[#FFF7ED] border border-[#FFEDD5] rounded-xl p-4 text-center mt-4";
        banner.innerHTML = `<p class="text-[#C2410C] font-semibold">${datos.mensaje}</p>`;
        if (precioActualEl && precioActualEl.parentElement) {
            precioActualEl.parentElement.appendChild(banner);
        }
    });

    //------------------------------------
    // ERRORES
    //------------------------------------

    socket.on("subasta:error", (datos) => {
        if (mensajeError && alertaError) {
            mensajeError.textContent = datos.mensaje;
            alertaError.classList.remove("hidden");
            setTimeout(() => alertaError.classList.add("hidden"), 4000);
        }

        if (btnPujar) {
            btnPujar.disabled = false;
            btnPujar.textContent = "Pujar";
        }
    });

    //====================================
    // ENVIAR PUJA
    //====================================

    if (btnPujar) {
        btnPujar.addEventListener("click", () => {
            const monto = Number(montoPujaInput.value);
            const minima = Math.round(precioActual * 1.05 * 100) / 100;

            if (!monto || monto < minima) {
                if (mensajeError && alertaError) {
                    mensajeError.textContent = `Tu puja debe ser de al menos ${formatearMonto(minima)} (5% superior al precio actual).`;
                    alertaError.classList.remove("hidden");
                    setTimeout(() => alertaError.classList.add("hidden"), 4000);
                }
                return;
            }

            // Ocultar alertas previas
            if (alertaError) alertaError.classList.add("hidden");
            if (alertaExito) alertaExito.classList.add("hidden");

            btnPujar.disabled = true;
            btnPujar.textContent = "Enviando...";

            const token = localStorage.getItem("token");

            socket.emit("subasta:pujar", {
                subastaId,
                monto,
                token
            });

            // Rehabilitar el botón después de un breve delay
            setTimeout(() => {
                btnPujar.disabled = false;
                btnPujar.textContent = "Pujar";
                montoPujaInput.value = "";

                if (alertaExito) {
                    alertaExito.classList.remove("hidden");
                    setTimeout(() => alertaExito.classList.add("hidden"), 3000);
                }
            }, 500);
        });
    }

    // Permitir pujar con Enter
    if (montoPujaInput) {
        montoPujaInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                btnPujar.click();
            }
        });
    }

    //------------------------------------
    // CHAT EN TIEMPO REAL
    //------------------------------------

    const listaChatEl = document.getElementById("lista-chat");
    const mensajeChatInput = document.getElementById("mensaje-chat");
    const btnEnviarChat = document.getElementById("btn-enviar-chat");

    const crearElementoMensaje = (msg) => {
        const div = document.createElement("div");
        div.className = "flex items-start gap-2.5 mb-3";

        const inicial = msg.usuario ? msg.usuario.charAt(0).toUpperCase() : "?";

        div.innerHTML = `
            <div class="w-7 h-7 rounded-full bg-[#EFECE6] border border-[#E2DDD5] flex flex-shrink-0 items-center justify-center text-xs font-bold text-[#1A1614]">${inicial}</div>
            <div class="bg-[#F7F4EF] border border-[#EBE5DC] rounded-2xl px-3.5 py-2 max-w-[85%]">
                <div class="flex items-center gap-2 mb-0.5">
                    <span class="text-xs font-bold text-[#1A1614]">${msg.usuario || "Anónimo"}</span>
                    <span class="text-[10px] text-[#8A7F76]">${formatearHora(msg.fecha)}</span>
                </div>
                <p class="text-xs text-[#3D3530] leading-relaxed break-words">${msg.mensaje}</p>
            </div>
        `;

        return div;
    };

    socket.on("subasta:historial-chat", (datos) => {
        if (!listaChatEl) return;
        listaChatEl.innerHTML = "";
        if (datos.mensajes && datos.mensajes.length > 0) {
            datos.mensajes.forEach((msg) => {
                listaChatEl.appendChild(crearElementoMensaje(msg));
            });
            listaChatEl.scrollTop = listaChatEl.scrollHeight;
        } else {
            listaChatEl.innerHTML = `
                <div class="text-center py-8 text-[#8A7F76] text-xs">
                    No hay mensajes en el chat todavía. ¡Sé el primero en escribir!
                </div>
            `;
        }
    });

    socket.on("subasta:nuevo-mensaje", (msg) => {
        if (!listaChatEl) return;
        const estadoVacio = listaChatEl.querySelector(".text-center");
        if (estadoVacio) estadoVacio.remove();

        listaChatEl.appendChild(crearElementoMensaje(msg));
        listaChatEl.scrollTop = listaChatEl.scrollHeight;
    });

    if (btnEnviarChat && mensajeChatInput) {
        const enviarMensaje = () => {
            const texto = mensajeChatInput.value.trim();
            if (!texto) return;

            const token = localStorage.getItem("token");
            socket.emit("subasta:enviar-mensaje", {
                subastaId,
                mensaje: texto,
                token
            });

            mensajeChatInput.value = "";
        };

        btnEnviarChat.addEventListener("click", enviarMensaje);
        mensajeChatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                enviarMensaje();
            }
        });
    }

    // Tab Switching: Pujas vs Chat
    const tabPujasBtn = document.getElementById("tab-pujas-btn");
    const tabChatBtn = document.getElementById("tab-chat-btn");
    const panelPujas = document.getElementById("panel-pujas");
    const panelChat = document.getElementById("panel-chat");

    if (tabPujasBtn && tabChatBtn && panelPujas && panelChat) {
        tabPujasBtn.addEventListener("click", () => {
            panelPujas.classList.remove("hidden");
            panelChat.classList.add("hidden");
            tabPujasBtn.classList.add("border-[#D97706]", "text-[#D97706]");
            tabPujasBtn.classList.remove("border-transparent", "text-[#8A7F76]");
            tabChatBtn.classList.remove("border-[#D97706]", "text-[#D97706]");
            tabChatBtn.classList.add("border-transparent", "text-[#8A7F76]");
        });

        tabChatBtn.addEventListener("click", () => {
            panelChat.classList.remove("hidden");
            panelPujas.classList.add("hidden");
            tabChatBtn.classList.add("border-[#D97706]", "text-[#D97706]");
            tabChatBtn.classList.remove("border-transparent", "text-[#8A7F76]");
            tabPujasBtn.classList.remove("border-[#D97706]", "text-[#D97706]");
            tabPujasBtn.classList.add("border-transparent", "text-[#8A7F76]");
            if (listaChatEl) listaChatEl.scrollTop = listaChatEl.scrollHeight;
        });
    }

    //------------------------------------
    // AUTO-PUJA
    //------------------------------------

    const montoAutoInput = document.getElementById("monto-auto-puja");
    const btnActivarAuto = document.getElementById("btn-activar-auto");
    const btnCancelarAuto = document.getElementById("btn-cancelar-auto");
    const infoAutoEstado = document.getElementById("info-auto-estado");

    socket.on("subasta:auto-puja-confirmado", (datos) => {
        if (infoAutoEstado) {
            infoAutoEstado.textContent = datos.mensaje;
            infoAutoEstado.classList.remove("hidden");
        }
    });

    socket.on("subasta:auto-puja-cancelado", () => {
        if (infoAutoEstado) {
            infoAutoEstado.textContent = "";
            infoAutoEstado.classList.add("hidden");
        }
    });

    if (btnActivarAuto && montoAutoInput) {
        btnActivarAuto.addEventListener("click", () => {
            const max = Number(montoAutoInput.value);
            const token = localStorage.getItem("token");
            if (!max || max <= 0) return;

            socket.emit("subasta:auto-puja", {
                subastaId,
                montoMaximo: max,
                token
            });
            montoAutoInput.value = "";
        });
    }

    if (btnCancelarAuto) {
        btnCancelarAuto.addEventListener("click", () => {
            const token = localStorage.getItem("token");
            socket.emit("subasta:cancelar-auto-puja", { subastaId, token });
        });
    }

    //====================================
    // LIMPIEZA AL SALIR DE LA PÁGINA
    //====================================

    window.addEventListener("beforeunload", () => {
        if (timerGeneralInterval) clearInterval(timerGeneralInterval);
        socket.emit("subasta:salir", { subastaId });
        socket.disconnect();
    });
})();
