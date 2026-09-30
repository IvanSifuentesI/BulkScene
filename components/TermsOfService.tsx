import React, { memo } from 'react';

interface TermsOfServiceProps {
    onBack: () => void;
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto text-slate-300">
            <button onClick={onBack} className="mb-8 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors font-semibold">
                &larr; Volver a la Aplicación
            </button>
            <div className="space-y-6 bg-slate-900/50 p-8 rounded-lg">
                <h1 className="text-3xl font-bold text-violet-400">Términos de Servicio</h1>
                <p><strong>Última actualización:</strong> [FECHA]</p>

                <p>Lea estos términos y condiciones detenidamente antes de utilizar nuestro Servicio.</p>

                <h2 className="text-2xl font-semibold text-slate-200 pt-4 border-t border-slate-700">Reconocimiento</h2>
                <p>Estos son los Términos y Condiciones que rigen el uso de este Servicio y el acuerdo que opera entre usted y la Compañía. Estos Términos y Condiciones establecen los derechos y obligaciones de todos los usuarios con respecto al uso del Servicio.</p>
                <p>Su acceso y uso del Servicio está condicionado a su aceptación y cumplimiento de estos Términos y Condiciones. Al acceder o utilizar el Servicio, usted acepta estar sujeto a estos Términos y Condiciones.</p>

                <h2 className="text-2xl font-semibold text-slate-200 pt-4 border-t border-slate-700">Uso del Servicio</h2>
                <p>Usted es responsable de su uso del Servicio, incluido el contenido que genera. Usted declara y garantiza que tiene los derechos necesarios sobre todo el contenido que introduce en el Servicio y que dicho contenido no infringe los derechos de terceros.</p>
                <p>Usted acepta no utilizar el Servicio para ningún propósito ilegal o prohibido por estos Términos. El contenido generado por la IA puede no ser siempre preciso o completo. Usted es responsable de verificar la información generada antes de su uso.</p>

                <h2 className="text-2xl font-semibold text-slate-200 pt-4 border-t border-slate-700">Claves de API</h2>
                <p>El Servicio requiere el uso de claves de API de servicios de terceros. Usted es el único responsable de obtener estas claves de API y de mantener su confidencialidad. No nos hacemos responsables de ningún uso no autorizado de sus claves de API.</p>

                <h2 className="text-2xl font-semibold text-slate-200 pt-4 border-t border-slate-700">Terminación</h2>
                <p>Podemos terminar o suspender su acceso inmediatamente, sin previo aviso ni responsabilidad, por cualquier motivo, incluido, entre otros, si usted incumple estos Términos y Condiciones.</p>

                <h2 className="text-2xl font-semibold text-slate-200 pt-4 border-t border-slate-700">Limitación de Responsabilidad</h2>
                <p>EN LA MEDIDA MÁXIMA PERMITIDA POR LA LEY APLICABLE, EN NINGÚN CASO LA COMPAÑÍA O SUS PROVEEDORES SERÁN RESPONSABLES DE NINGÚN DAÑO ESPECIAL, INCIDENTAL, INDIRECTO O CONSECUENTE (INCLUIDOS, ENTRE OTROS, DAÑOS POR PÉRDIDA DE BENEFICIOS, PÉRDIDA DE DATOS U OTRA INFORMACIÓN, POR INTERRUPCIÓN DEL NEGOCIO, POR LESIONES PERSONALES, PÉRDIDA DE PRIVACIDAD) DERIVADOS DE O RELACIONADOS DE ALGUNA MANERA CON EL USO O LA IMPOSIBILIDAD DE USAR EL SERVICIO.</p>

                <h2 className="text-2xl font-semibold text-slate-200 pt-4 border-t border-slate-700">Cambios a estos Términos</h2>
                <p>Nos reservamos el derecho, a nuestra entera discreción, de modificar o reemplazar estos Términos en cualquier momento. Si una revisión es material, haremos esfuerzos razonables para proporcionar un aviso de al menos 30 días antes de que los nuevos términos entren en vigencia.</p>

                <h2 className="text-2xl font-semibold text-slate-200 pt-4 border-t border-slate-700">Contáctenos</h2>
                <p>Si tiene alguna pregunta sobre estos Términos y Condiciones, puede contactarnos en: [SU CORREO ELECTRÓNICO DE CONTACTO]</p>
            </div>
        </div>
    );
};

export default memo(TermsOfService);
