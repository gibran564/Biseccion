$(document).ready(function() {
    $.EcuacionCuadratica = function(options) {
        this.settings = $.extend({
            inputSelector: '#ecuacion',
            resultadoSelector: '#resultado',
            canvasSelector: '#grafica',
            tolerancia: 0.0001,
            maxIteraciones: 100
        }, options);

        this.init();
    };

    $.EcuacionCuadratica.prototype = {
        init: function() {
            this.errores = [];
            this.tokens = [];
            this.parentesisStack = [];
            this.bindEvents();
            this.setupCanvas();
        },

        bindEvents: function() {
            var self = this;
            $(this.settings.inputSelector).on('input', function() {
                self.validarSintaxis($(this).val());
            });
        },

        setupCanvas: function() {
            this.$canvas = $(this.settings.canvasSelector);
        
            this.$canvas[0].width = this.$canvas.width();
            this.$canvas[0].height = this.$canvas.height();
        
            this.ctx = this.$canvas[0].getContext('2d');
        
            this.escala = 20;
            this.origenX = this.$canvas[0].width / 2;
            this.origenY = this.$canvas[0].height / 2;
        },
        

        validarSintaxis: function(ecuacion) {
            // Reiniciar errores, tokens y stack de paréntesis
            this.errores = [];
            this.tokens = [];
            this.parentesisStack = [];

            // Preprocesar la ecuación: quitar espacios y normalizar el exponente
            ecuacion = ecuacion.replace(/\s+/g, '')
                               .replace(/\*\*x²/g, 'x^2')
                               .replace(/\*\*x\^2/g, 'x^2')
                               .replace(/x²/g, 'x^2');

            try {
                this.tokens = this.tokenize(ecuacion);
            } catch (e) {
                this.errores.push(e.message);
            }

            if (this.parentesisStack.length > 0) {
                this.errores.push("Error: Paréntesis sin cerrar.");
            }

            var resultado = this.validarEcuacionCuadratica();
            this.mostrarResultado(resultado);
            return resultado;
        },

        tokenize: function(ecuacion) {
            var tokens = [];
            var i = 0;

            while (i < ecuacion.length) {
                var char = ecuacion[i];

                if (/\d/.test(char) || (char === '.' && i + 1 < ecuacion.length && /\d/.test(ecuacion[i + 1]))) {
                    var numStr = "";
                    var dotCount = 0;
                    while (i < ecuacion.length && (/\d/.test(ecuacion[i]) || ecuacion[i] === '.')) {
                        if (ecuacion[i] === '.') {
                            dotCount++;
                            if (dotCount > 1) {
                                throw new Error("Error: Número con más de un punto decimal en posición " + (i + 1));
                            }
                        }
                        numStr += ecuacion[i];
                        i++;
                    }
                    tokens.push({ tipo: 'coeficiente', valor: parseFloat(numStr), lexema: numStr });
                    continue;
                }

                if (/[a-zA-Z]/.test(char)) {
                    tokens.push({ tipo: 'variable', valor: char, lexema: char });
                    i++;
                    continue;
                }

                if (char === '^') {
                    i++;
                    var expStr = "";
                    while (i < ecuacion.length && /\d/.test(ecuacion[i])) {
                        expStr += ecuacion[i];
                        i++;
                    }
                    if (expStr === "") {
                        throw new Error("Error: Se esperaba un exponente después de '^' en posición " + i);
                    }
                    tokens.push({ tipo: 'exponente', valor: parseInt(expStr), lexema: '^' + expStr });
                    continue;
                }

                if (char === '²') {
                    tokens.push({ tipo: 'exponente', valor: 2, lexema: '²' });
                    i++;
                    continue;
                }

                if (['+', '-', '*', '/'].includes(char)) {
                    tokens.push({ tipo: 'operador', valor: char, lexema: char });
                    i++;
                    continue;
                }

                if (char === '(') {
                    tokens.push({ tipo: 'parentesis_abierto', valor: char, lexema: char });
                    this.parentesisStack.push(i);
                    i++;
                    continue;
                }

                if (char === ')') {
                    if (this.parentesisStack.length === 0) {
                        throw new Error("Error: Paréntesis de cierre sin apertura en posición " + (i + 1));
                    }
                    this.parentesisStack.pop();
                    tokens.push({ tipo: 'parentesis_cerrado', valor: char, lexema: char });
                    i++;
                    continue;
                }

                throw new Error("Error: Carácter inválido '" + char + "' en posición " + (i + 1));
            }

            return tokens;
        },

        validarEcuacionCuadratica: function() {
            if (this.errores.length > 0) {
                return {
                    esValida: false,
                    errores: this.errores,
                    tokens: this.tokens
                };
            }

            var coeficientes = this.extraerCoeficientes();

            if (coeficientes.a === 0) {
                this.errores.push("No es una ecuación cuadrática: el coeficiente de x² es 0");
            }

            return {
                esValida: this.errores.length === 0,
                errores: this.errores,
                tokens: this.tokens,
                coeficientes: coeficientes
            };
        },

        extraerCoeficientes: function() {
            var a = 0, b = 0, c = 0;
            var currentSign = 1;
            var i = 0;

            while (i < this.tokens.length) {
                var token = this.tokens[i];

                // Manejar operadores para determinar el signo
                if (token.tipo === 'operador') {
                    currentSign = (token.valor === '-' ? -1 : 1);
                    i++;
                    continue;
                }

                // Saltar paréntesis (se asume que no afectan la forma cuadrática)
                if (token.tipo === 'parentesis_abierto' || token.tipo === 'parentesis_cerrado') {
                    i++;
                    continue;
                }

                // Procesar un término: puede iniciar con un coeficiente o directamente con una variable
                var coef = 1;
                if (token.tipo === 'coeficiente') {
                    coef = token.valor;
                    i++;
                }
                coef *= currentSign;

                // Verificar si el término tiene variable
                if (i < this.tokens.length && this.tokens[i].tipo === 'variable') {
                    i++; // Consumir el token de variable

                    // Por defecto, si no hay exponente se asume 1 (término lineal)
                    var exponente = 1;
                    if (i < this.tokens.length && this.tokens[i].tipo === 'exponente') {
                        exponente = this.tokens[i].valor;
                        i++;
                    }

                    if (exponente === 2) {
                        a += coef;
                    } else if (exponente === 1) {
                        b += coef;
                    } else {
                        this.errores.push("Error: Exponente " + exponente + " no soportado para ecuación cuadrática.");
                    }
                } else {
                    // Si no hay variable, es un término constante
                    c += coef;
                }

                // Reiniciar el signo para el siguiente término
                currentSign = 1;
            }

            return { a: a, b: b, c: c };
        },

        mostrarResultado: function(resultado) {
            var $resultado = $(this.settings.resultadoSelector);

            if (!resultado.esValida) {
                $resultado.html('<div class="error">Errores: ' + resultado.errores.join(', ') + '</div>');
                return;
            }

            var a = resultado.coeficientes.a,
                b = resultado.coeficientes.b,
                c = resultado.coeficientes.c;

            $resultado.html(
                '<div class="success">' +
                '<p>Ecuación cuadrática válida: ' + a + 'x² + ' + b + 'x + ' + c + '</p>' +
                '</div>'
            );

            this.graficarEcuacion(resultado.coeficientes);

            this.metodoBiseccion();
        },

        graficarEcuacion: function(coef) {
            var a = coef.a, b = coef.b, c = coef.c;
            var ctx = this.ctx;
        
            // Usar el tamaño interno real del canvas
            var width = this.$canvas[0].width;
            var height = this.$canvas[0].height;
        
            ctx.clearRect(0, 0, width, height);
        
            // Dibujar ejes
            ctx.beginPath();
            ctx.strokeStyle = '#666';
        
            // Eje horizontal
            ctx.moveTo(0, this.origenY);
            ctx.lineTo(width, this.origenY);
        
            // Eje vertical
            ctx.moveTo(this.origenX, 0);
            ctx.lineTo(this.origenX, height);
        
            ctx.stroke();
        
            // Graficar la función cuadrática
            ctx.beginPath();
            ctx.strokeStyle = '#00f';
            ctx.lineWidth = 2;
        
            for (var i = 0; i < width; i++) {
                // Trasladar i píxeles a coordenadas reales
                var x = (i - this.origenX) / this.escala;
                var y = a * x * x + b * x + c;
        
                // Convertir la coordenada y al canvas (origen en el centro)
                var canvasY = this.origenY - (y * this.escala);
        
                if (i === 0) {
                    ctx.moveTo(i, canvasY);
                } else {
                    ctx.lineTo(i, canvasY);
                }
            }
            ctx.stroke();
        },
        

        metodoBiseccion: function() {
            let xValue = 2;
            let resultado = 0;
            let i = 0;
            let signo = 1;
        
            // Recorremos los tokens con un while para poder avanzar más de uno cuando sea necesario
            while (i < this.tokens.length) {
                let token = this.tokens[i];
        
                // Si es operador, actualizamos el signo y pasamos al siguiente token
                if (token.tipo === 'operador') {
                    signo = (token.valor === '-') ? -1 : 1;
                    i++;
                    continue;
                }
        
                // Si es un coeficiente, lo tomamos y miramos si el siguiente token es una variable
                if (token.tipo === 'coeficiente') {
                    let coef = token.valor * signo;
                    // Si hay una variable a continuación, se trata de un término con x
                    if (i + 1 < this.tokens.length && this.tokens[i + 1].tipo === 'variable') {
                        i++; // Consumir el coeficiente y pasar a la variable
                        let exponente = 1; 
                        // Si el siguiente token es un exponente, lo consumimos
                        if (i + 1 < this.tokens.length && this.tokens[i + 1].tipo === 'exponente') {
                            exponente = this.tokens[i + 1].valor;
                            i++;
                        }
                        resultado += coef * Math.pow(xValue, exponente);
                    } else {
                        // Si no le sigue una variable, es un término constante
                        resultado += coef;
                    }
                    // Reiniciamos el signo para el siguiente término
                    signo = 1;
                    i++;
                    continue;
                }
        
                // Si encontramos una variable sin coeficiente explícito (coeficiente implícito)
                if (token.tipo === 'variable') {
                    // El coeficiente implícito es 1, pero hay que aplicarle el signo acumulado
                    let coef = signo;
                    let exponente = 1; // Por defecto, x^1
                    // Si el siguiente token es exponente, lo tomamos
                    if (i + 1 < this.tokens.length && this.tokens[i + 1].tipo === 'exponente') {
                        exponente = this.tokens[i + 1].valor;
                        i++;
                    }
                    resultado += coef * Math.pow(xValue, exponente);
                    signo = 1;
                    i++;
                    continue;
                }
        
                // Si el token es de otro tipo (por ejemplo, exponente aislado), lo ignoramos
                i++;
            }
        
            console.log("Evaluación de la ecuación en x =", xValue, "es:", resultado);
        }
        
        
    };

    $.fn.ecuacionCuadratica = function(options) {
        return this.each(function() {
            if (!$.data(this, 'ecuacionCuadratica')) {
                $.data(this, 'ecuacionCuadratica', new $.EcuacionCuadratica(options));
            }
        });
    };
});
