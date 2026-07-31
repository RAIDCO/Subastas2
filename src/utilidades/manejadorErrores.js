// Helper para centralizar el manejo de respuestas y errores HTTP

//====================================
// RESPUESTAS ESTÁNDAR DE LA API
// Todas las respuestas comparten la misma forma para que el
// frontend pueda tratarlas siempre igual.
//====================================

const responderExito = (res, estado, mensaje, datos = null) => {
    return res.status(estado).json({
        exito: true,
        mensaje,
        datos
    });
};

const responderError = (res, estado, mensaje, errores = null) => {
    return res.status(estado).json({
        exito: false,
        mensaje,
        errores
    });
};

//====================================
// ERROR DE APLICACIÓN
// Permite lanzar errores con un código HTTP concreto desde
// cualquier controlador o intermediario.
//====================================

class ErrorAplicacion extends Error {
    constructor(mensaje, estado = 500, errores = null) {
        super(mensaje);
        this.name = "ErrorAplicacion";
        this.estado = estado;
        this.errores = errores;
    }
}

//====================================
// CAPTURA DE ERRORES ASÍNCRONOS
// Envuelve un controlador async para que cualquier promesa
// rechazada llegue al middleware de errores de Express.
//====================================

const capturarAsincrono = (controlador) => {
    return (req, res, next) => {
        Promise.resolve(controlador(req, res, next)).catch(next);
    };
};

module.exports = {
    responderExito,
    responderError,
    ErrorAplicacion,
    capturarAsincrono
};
