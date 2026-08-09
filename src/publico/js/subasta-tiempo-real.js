// Cliente Socket.io para pujas en tiempo real en la página de detalle de subasta.
// Este script se carga solo cuando la subasta está activa.

(function () {
    "use strict";

    //====================================
    // ELEMENTOS DEL DOM
    //====================================

    const subastaId = document.getElementById("subasta-id").value;
    const cronometroEl = document.getElementById("cronometro");
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

    const formatearHora = (fecha) => {
        const d = new Date(fecha);
        return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    };

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
        div.className = "flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-700/50 animate-pulse-once";

        const inicial = puja.usuario ? puja.usuario.charAt(0).toUpperCase() : "?";

        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400">${inicial}</div>
                <div>
                    <p class="text-sm font-semibold text-white">${puja.usuario || "Anónimo"}</p>
                    <p class="text-xs text-slate-500">${formatearHora(puja.fecha)}</p>
                </div>
            </div>
            <p class="text-emerald-400 font-bold">${formatearMonto(puja.monto)}</p>
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
        } else if (datos.segundosRestantes > 0) {
            if (timerProgramadaInterval) clearInterval(timerProgramadaInterval);
            if (cronometroEl) cronometroEl.textContent = formatearTiempo(datos.segundosRestantes);
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
        precioActualEl.textContent = formatearMonto(precioActual);
        actualizarPujaMinima();

        // Actualizar cronómetro
        if (datos.segundosRestantes) {
            cronometroEl.textContent = formatearTiempo(datos.segundosRestantes);
            cronometroEl.classList.remove("text-red-400");
            cronometroEl.classList.add("text-white");
        }

        // Quitar el estado vacío si existe
        const estadoVacio = listaPujasEl.querySelector(".text-center");
        if (estadoVacio) estadoVacio.remove();

        // Agregar la puja al inicio de la lista
        const elemento = crearElementoPuja(datos);
        listaPujasEl.insertBefore(elemento, listaPujasEl.firstChild);

        // Flash visual en el elemento
        setTimeout(() => {
            elemento.classList.remove("animate-pulse-once");
        }, 600);
    });

    //------------------------------------
    // TIEMPO ACTUALIZADO (tick cada segundo)
    //------------------------------------

    socket.on("subasta:tiempo-actualizado", (datos) => {
        cronometroEl.textContent = formatearTiempo(datos.segundosRestantes);

        // Efecto de urgencia cuando queda menos de 1 minuto
        if (datos.segundosRestantes <= 60 && datos.segundosRestantes > 0) {
            cronometroEl.classList.add("text-red-400");
            cronometroEl.classList.remove("text-white");
        } else {
            cronometroEl.classList.remove("text-red-400");
            cronometroEl.classList.add("text-white");
        }
    });

    //------------------------------------
    // SUBASTA FINALIZADA
    //------------------------------------

    socket.on("subasta:finalizada", (datos) => {
        cronometroEl.textContent = "00:00";
        cronometroEl.classList.remove("text-red-400");
        cronometroEl.classList.add("text-slate-500");

        // Deshabilitar formulario de puja
        if (montoPujaInput) montoPujaInput.disabled = true;
        if (btnPujar) {
            btnPujar.disabled = true;
            btnPujar.textContent = "Finalizada";
            btnPujar.classList.remove("bg-emerald-500", "hover:bg-emerald-600", "shadow-lg", "shadow-emerald-500/20");
            btnPujar.classList.add("bg-slate-700", "cursor-not-allowed");
        }

        // Mostrar mensaje de finalización
        const banner = document.createElement("div");
        banner.className = "bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center mt-4";
        banner.innerHTML = `<p class="text-amber-400 font-semibold">${datos.mensaje}</p>`;
        precioActualEl.parentElement.appendChild(banner);
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

    //====================================
    // LIMPIEZA AL SALIR DE LA PÁGINA
    //====================================

    window.addEventListener("beforeunload", () => {
        socket.emit("subasta:salir", { subastaId });
        socket.disconnect();
    });
})();
