import React, { memo } from 'react';

interface PrivacyPolicyProps {
    onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto text-slate-300">
            <button onClick={onBack} className="mb-8 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors font-semibold">
                &larr; Volver a la Aplicación
            </button>
            <div className="space-y-6 bg-slate-900/50 p-8 rounded-lg">
                <h1 className="text-3xl font-bold text-violet-400">Política de Privacidad</h1>
                <p><strong>Última actualización:</strong> [FECHA]</p>

                <p>Esta Política de Privacidad describe nuestras políticas y procedimientos sobre la recopilación, uso y divulgación de su información cuando utiliza el Servicio y le informa sobre sus derechos de privacidad y cómo la ley lo protege.</p>

                <h2 className="text-2xl font-semibold text-slate-200 pt-4 border-t border-slate-700">Recopilación y Uso de Datos Personales</h2>
                <p>Al utilizar nuestra aplicación, podemos recopilar y procesar la siguiente información:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                    <li><strong>Claves de API:</strong> Las claves de API que usted proporciona para los servicios de Google Gemini e Imagen 3 se almacenan exclusivamente en el almacenamiento local de su navegador (`localStorage`). No se transmiten a servidores intermediarios.</li>
                    <li><strong>Datos del Proyecto:</strong> La información que crea, como listas de prompts, imágenes generadas e historial de proyectos, se almacena en el almacenamiento local de su navegador. No tenemos acceso a esta información.</li>
                </ul>

                <h2 className="text-2xl font-semibold text-slate-200 pt-4 border-t border-slate-700">Servicios de Terceros</h2>
                <p>La aplicación interactúa con las siguientes API de terceros. Le recomendamos que revise sus políticas de privacidad:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                    <li><strong>Google Gemini API:</strong> Utilizada para la generación y estructuración de guiones, optimización de prompts y generación nativa de imágenes fotorealistas con los modelos de Gemini. Su política de privacidad está disponible en el sitio web de Google.</li>
                </ul>
                
                <h2 className="text-2xl font-semibold text-slate-200 pt-4 border-t border-slate-700">Seguridad de los Datos</h2>
                <p>La seguridad de sus datos es importante para nosotros. Dado que todos los datos sensibles se almacenan en el lado del cliente (en su navegador), el control sobre ellos permanece en sus manos. Sin embargo, recuerde que ningún método de transmisión por Internet o de almacenamiento electrónico es 100% seguro.</p>
                
                <h2 className="text-2xl font-semibold text-slate-200 pt-4 border-t border-slate-700">Cambios a esta Política de Privacidad</h2>
                <p>Podemos actualizar nuestra Política de Privacidad de vez en cuando. Le notificaremos cualquier cambio publicando la nueva Política de Privacidad en esta página. Se le aconseja revisar esta Política de Privacidad periódicamente para detectar cualquier cambio.</p>

                <h2 className="text-2xl font-semibold text-slate-200 pt-4 border-t border-slate-700">Contáctenos</h2>
                <p>Si tiene alguna pregunta sobre esta Política de Privacidad, puede contactarnos en: [SU CORREO ELECTRÓNICO DE CONTACTO]</p>
            </div>
        </div>
    );
};

export default memo(PrivacyPolicy);
