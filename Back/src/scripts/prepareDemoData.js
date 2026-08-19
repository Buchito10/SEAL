require("dotenv").config();

const { initFirebase, db } = require("../config/firebase");

const usersService = require("../services/users.service");
const contractsService = require("../services/contracts.service");
const assignmentsService = require("../services/assignments.service");

const passwordTokensService = require(
    "../services/passwordTokens.service"
);

const signatureTokensService = require(
    "../services/signatureTokens.service"
);

const {
    validatePlaceholdersOrThrow,
} = require("../utils/placeholders");

const {
    hashPassword,
} = require("../utils/password");


// ============================================================
// CONFIGURACIÓN
// ============================================================

const APPLY =
    process.argv.includes("--apply");

const DELETE_CLIENTS =
    process.argv.includes("--delete-clients");

/*
 * IMPORTANTE:
 *
 * Pon en Back/.env algo como:
 *
 * DEMO_PASSWORD=<define-una-clave-segura>
 *
 * No subas esa contraseña a GitHub.
 */
const DEMO_PASSWORD =
    process.env.DEMO_PASSWORD;


// ============================================================
// USUARIOS DEMO
// ============================================================

const DEMO_USERS = [
    {
        name: "Administrador Demo",

        email:
            "admin.demo@seal.test",

        role:
            "ADMIN",

        position:
            "Administrador",

        profile_completed:
            true,
    },

    {
        name:
            "Ana Torres Demo",

        email:
            "ana.frontend@seal.test",

        role:
            "CLIENT",

        position:
            "Desarrolladora Frontend",

        rfc:
            "TODA900101AB1",

        curp:
            "TODA900101MDFRNN01",

        phone:
            "5550001001",

        address_line1:
            "Av. Reforma 100",

        address_line2:
            "Piso 4",

        address_city:
            "Ciudad de México",

        address_state:
            "CDMX",

        address_zip:
            "06000",

        address_country:
            "MX",

        profile_completed:
            true,
    },

    {
        name:
            "Luis Mendoza Demo",

        email:
            "luis.backend@seal.test",

        role:
            "CLIENT",

        position:
            "Desarrollador Backend",

        rfc:
            "MEDL910202CD2",

        curp:
            "MEDL910202HDFNMS02",

        phone:
            "5550001002",

        address_line1:
            "Av. Insurgentes Sur 250",

        address_line2:
            "Departamento 12",

        address_city:
            "Ciudad de México",

        address_state:
            "CDMX",

        address_zip:
            "03100",

        address_country:
            "MX",

        profile_completed:
            true,
    },

    {
        name:
            "Sofía Castillo Demo",

        email:
            "sofia.qa@seal.test",

        role:
            "CLIENT",

        position:
            "QA Tester",

        rfc:
            "CASS920303EF3",

        curp:
            "CASS920303MDFSTR03",

        phone:
            "5550001003",

        address_line1:
            "Calle Durango 180",

        address_line2:
            null,

        address_city:
            "Ciudad de México",

        address_state:
            "CDMX",

        address_zip:
            "06700",

        address_country:
            "MX",

        profile_completed:
            true,
    },
];


// ============================================================
// BLOQUES DE CONTRATO REUTILIZABLES
// ============================================================

const COMMON_DECLARATIONS = `
<h2>DECLARACIONES</h2>

<p>
<strong>I. Declara LA PARTE EMPLEADORA</strong>,
por conducto de {{ company.legal_representative_name }},
que requiere los servicios de una persona para desempeñar
el puesto de {{ company.position }} dentro del área de
{{ company.area }}, y que cuenta con los medios necesarios
para organizar y supervisar las actividades propias de dicha
posición.
</p>

<p>
<strong>II. Declara LA PERSONA TRABAJADORA</strong>,
{{ employee.name }}, identificada para fines internos con
RFC {{ employee.rfc }} y CURP {{ employee.curp }},
que proporciona como medios de contacto el correo
{{ employee.email }} y el teléfono {{ employee.phone }},
y que manifiesta contar con los conocimientos y experiencia
necesarios para desempeñar las funciones relacionadas con
el puesto.
</p>

<p>
<strong>III. Declaran ambas partes</strong>
que la información incorporada al documento deberá
verificarse antes de su firma y que la versión final será
objeto de revisión humana antes de su utilización.
</p>
`;


const COMMON_CLAUSES = `
<h2>CLÁUSULAS</h2>

<p>
<strong>PRIMERA. Objeto de la relación.</strong>
LA PERSONA TRABAJADORA se obliga a prestar sus servicios
personales y subordinados en el puesto de
{{ company.position }}, adscrita al área de
{{ company.area }}, realizando las actividades propias de
su especialidad y aquellas tareas razonablemente vinculadas
con los objetivos de la posición.
</p>

<p>
<strong>SEGUNDA. Inicio y duración.</strong>
La relación iniciará el {{ company.start_date }} y tendrá
una duración de {{ company.duration }}.
Cualquier modificación relacionada con la vigencia deberá
documentarse y comunicarse a ambas partes.
</p>

<p>
<strong>TERCERA. Jornada de trabajo.</strong>
La jornada y horario aplicables serán
{{ company.work_schedule }}.
La distribución efectiva del tiempo de trabajo, descansos
y cualquier ajuste operativo deberán comunicarse con
claridad y de acuerdo con las condiciones aplicables.
</p>

<p>
<strong>CUARTA. Remuneración.</strong>
Como contraprestación por los servicios prestados,
LA PARTE EMPLEADORA cubrirá a LA PERSONA TRABAJADORA un
salario de {{ company.salary }}.
La periodicidad, forma de pago, retenciones y conceptos
adicionales deberán coincidir con la documentación
administrativa correspondiente.
</p>

<p>
<strong>QUINTA. Prestaciones y descansos.</strong>
LA PERSONA TRABAJADORA tendrá acceso a las prestaciones,
vacaciones, días de descanso y permisos que correspondan
conforme a las condiciones aplicables a la relación laboral.
Los conceptos específicos deberán ser confirmados antes de
la firma.
</p>

<p>
<strong>SEXTA. Obligaciones de LA PERSONA TRABAJADORA.</strong>
Deberá desempeñar sus funciones con diligencia, cumplir las
instrucciones relacionadas con su puesto, proteger la
información a la que tenga acceso, utilizar responsablemente
los recursos asignados, reportar incidencias relevantes y
mantener comunicación profesional con el equipo.
</p>

<p>
<strong>SÉPTIMA. Obligaciones de LA PARTE EMPLEADORA.</strong>
Deberá proporcionar los elementos razonablemente necesarios
para el desempeño del puesto, comunicar objetivos y políticas
aplicables, cubrir oportunamente la remuneración pactada y
mantener mecanismos adecuados de seguimiento y comunicación.
</p>

<p>
<strong>OCTAVA. Confidencialidad.</strong>
La información técnica, operativa, comercial, administrativa
o de clientes a la que tenga acceso LA PERSONA TRABAJADORA
deberá utilizarse exclusivamente para el cumplimiento de sus
funciones y no deberá divulgarse a terceros sin autorización.
</p>

<p>
<strong>NOVENA. Herramientas y recursos de trabajo.</strong>
Los equipos, accesos, cuentas, repositorios, licencias,
documentos y demás recursos proporcionados para el trabajo
deberán emplearse responsablemente y para fines relacionados
con la actividad profesional.
</p>

<p>
<strong>DÉCIMA. Datos personales.</strong>
Las partes deberán tratar los datos personales obtenidos con
motivo de la relación laboral de forma responsable,
utilizando únicamente la información necesaria para los
fines administrativos, operativos y legales asociados al
expediente.
</p>

<p>
<strong>DÉCIMA PRIMERA. Modificaciones.</strong>
Los cambios relevantes al puesto, área, horario,
remuneración, duración o condiciones sustanciales deberán
documentarse y ser revisados por las partes antes de
considerarse incorporados al acuerdo.
</p>

<p>
<strong>DÉCIMA SEGUNDA. Terminación.</strong>
La relación podrá concluir conforme a las causas y
procedimientos aplicables. Antes de realizar cualquier
actuación relacionada con terminación o separación,
la administración deberá revisar la documentación del
expediente y confirmar las obligaciones pendientes.
</p>

<p>
<strong>DÉCIMA TERCERA. Lectura y aceptación.</strong>
Las partes manifiestan que antes de firmar deberán revisar
el contenido completo, verificar sus datos, resolver dudas
y confirmar que el documento corresponda con las condiciones
efectivamente acordadas.
</p>
`;


const SIGNATURES = `
<h2>FIRMAS</h2>

<p>
Leído el presente documento y realizadas las revisiones
correspondientes, las partes podrán formalizarlo mediante
los mecanismos autorizados por SEAL.
</p>

<p>
<strong>LA PARTE EMPLEADORA</strong><br>
{{ company.legal_representative_name }}
</p>

<p>
<strong>LA PERSONA TRABAJADORA</strong><br>
{{ employee.name }}
</p>
`;


// ============================================================
// PLANTILLAS DE DEMOSTRACIÓN
// ============================================================

const DEMO_TEMPLATES = [
    {
        title:
            "Contrato laboral indefinido · Desarrollador Frontend",

        area:
            "Tecnología",

        position:
            "Desarrollador Frontend",

        duration:
            "Por tiempo indefinido",

        salary:
            "$32,000 MXN mensuales brutos",

        html: `
<h1>{{ company.title }}</h1>

<p>
Plantilla de relación laboral para el puesto de
<strong>{{ company.position }}</strong>.
</p>

${COMMON_DECLARATIONS}

${COMMON_CLAUSES}

<p>
<strong>DÉCIMA CUARTA. Funciones específicas del puesto.</strong>
LA PERSONA TRABAJADORA participará en el desarrollo y
mantenimiento de interfaces web, implementación de
componentes reutilizables, integración con servicios del
sistema, corrección de incidencias visuales y funcionales,
revisión de compatibilidad, accesibilidad y rendimiento del
frontend, así como colaboración con diseño, producto,
aseguramiento de calidad y equipos de backend.
</p>

<p>
<strong>DÉCIMA QUINTA. Calidad y entrega.</strong>
Las entregas deberán seguir los estándares técnicos definidos
por el equipo, incluyendo revisión de código, control de
versiones, documentación suficiente y validación antes de
liberar cambios a ambientes compartidos o productivos.
</p>

<p>
<strong>DÉCIMA SEXTA. Código y documentación.</strong>
LA PERSONA TRABAJADORA deberá procurar que el código,
componentes, configuraciones y documentación generados
durante sus actividades sean mantenibles y puedan ser
revisados por las personas responsables del proyecto.
</p>

${SIGNATURES}
`,
    },


    {
        title:
            "Contrato laboral indefinido · Desarrollador Backend",

        area:
            "Tecnología",

        position:
            "Desarrollador Backend",

        duration:
            "Por tiempo indefinido",

        salary:
            "$36,000 MXN mensuales brutos",

        html: `
<h1>{{ company.title }}</h1>

<p>
Plantilla de relación laboral para el puesto de
<strong>{{ company.position }}</strong>.
</p>

${COMMON_DECLARATIONS}

${COMMON_CLAUSES}

<p>
<strong>DÉCIMA CUARTA. Funciones específicas del puesto.</strong>
LA PERSONA TRABAJADORA participará en el diseño, desarrollo,
mantenimiento y documentación de servicios de backend,
APIs, integraciones, procesos de negocio y mecanismos de
persistencia de datos.
</p>

<p>
Asimismo, colaborará en análisis de incidencias, pruebas
técnicas, revisión de código, documentación, monitoreo y
mejoras relacionadas con seguridad, estabilidad y
rendimiento de los sistemas.
</p>

<p>
<strong>DÉCIMA QUINTA. Seguridad y accesos.</strong>
Las credenciales, llaves, secretos, bases de datos, servicios
internos y ambientes de infraestructura a los que tenga
acceso deberán utilizarse exclusivamente para las tareas
autorizadas.
</p>

<p>
Cualquier cambio que pueda afectar disponibilidad,
integridad o confidencialidad de los sistemas deberá seguir
los procedimientos de revisión definidos por el equipo.
</p>

<p>
<strong>DÉCIMA SEXTA. Gestión de cambios.</strong>
LA PERSONA TRABAJADORA deberá utilizar los mecanismos de
control de versiones y revisión establecidos para los
proyectos, procurando mantener trazabilidad sobre cambios
relevantes realizados a los sistemas.
</p>

${SIGNATURES}
`,
    },


    {
        title:
            "Contrato laboral temporal · QA Tester",

        area:
            "Calidad",

        position:
            "QA Tester",

        duration:
            "3 meses",

        salary:
            "$24,000 MXN mensuales brutos",

        html: `
<h1>{{ company.title }}</h1>

<p>
Plantilla de relación laboral temporal para el puesto de
<strong>{{ company.position }}</strong>.
</p>

${COMMON_DECLARATIONS}

<h2>CLÁUSULAS</h2>

<p>
<strong>PRIMERA. Objeto.</strong>
LA PERSONA TRABAJADORA prestará servicios en el puesto de
{{ company.position }} dentro del área de {{ company.area }},
participando en actividades de aseguramiento de calidad y
validación de los productos asignados.
</p>

<p>
<strong>SEGUNDA. Vigencia determinada.</strong>
La relación iniciará el {{ company.start_date }},
concluirá el {{ company.end_date }} y tendrá una duración
estimada de {{ company.duration }}.
Cualquier ampliación deberá formalizarse antes del
vencimiento previsto.
</p>

<p>
<strong>TERCERA. Jornada.</strong>
La jornada y horario serán {{ company.work_schedule }},
sujetos a la coordinación operativa necesaria para ejecutar
pruebas, documentar resultados y dar seguimiento a
incidencias.
</p>

<p>
<strong>CUARTA. Remuneración.</strong>
LA PARTE EMPLEADORA cubrirá un salario de
{{ company.salary }} conforme a la periodicidad y
condiciones administrativas que se confirmen antes de la
firma.
</p>

<p>
<strong>QUINTA. Funciones.</strong>
Entre las actividades del puesto estarán preparar y ejecutar
casos de prueba, documentar evidencia, reportar defectos de
forma reproducible, validar correcciones, participar en
pruebas de regresión y colaborar con desarrollo y producto
para mejorar la calidad de las entregas.
</p>

<p>
<strong>SEXTA. Obligaciones.</strong>
LA PERSONA TRABAJADORA deberá mantener trazabilidad de los
resultados, cuidar los accesos a ambientes de prueba, no
alterar información sin autorización y comunicar
oportunamente bloqueos o riesgos identificados.
</p>

<p>
<strong>SÉPTIMA. Confidencialidad.</strong>
Toda información de producto, usuarios, pruebas, incidencias
y documentación interna deberá utilizarse únicamente para
los fines de la relación laboral.
</p>

<p>
<strong>OCTAVA. Herramientas.</strong>
Los equipos, cuentas, ambientes y datos proporcionados serán
utilizados exclusivamente para actividades autorizadas de
aseguramiento de calidad.
</p>

<p>
<strong>NOVENA. Prestaciones y descansos.</strong>
Las condiciones correspondientes deberán confirmarse con
administración y quedar consistentes con la duración y
modalidad de la relación.
</p>

<p>
<strong>DÉCIMA. Terminación.</strong>
Al llegar la fecha de conclusión o presentarse alguna causa
aplicable de terminación, las partes deberán revisar
pendientes, devolución de recursos y documentación del
expediente.
</p>

<p>
<strong>DÉCIMA PRIMERA. Revisión y aceptación.</strong>
Antes de firmar, ambas partes deberán verificar datos,
fechas, salario, jornada, duración y contenido general del
documento.
</p>

${SIGNATURES}
`,
    },
];


// ============================================================
// HELPERS DE FIRESTORE
// ============================================================

async function deleteDocsInSnapshot(
    snapshot
) {
    if (snapshot.empty) {
        return 0;
    }

    let deleted = 0;

    for (
        let i = 0;
        i < snapshot.docs.length;
        i += 400
    ) {
        const batch =
            db().batch();

        const chunk =
            snapshot.docs.slice(
                i,
                i + 400
            );

        for (const doc of chunk) {
            batch.delete(
                doc.ref
            );
        }

        await batch.commit();

        deleted +=
            chunk.length;
    }

    return deleted;
}


async function deleteSubcollection(
    parentRef,
    name
) {
    let deleted = 0;

    while (true) {
        const snap =
            await parentRef
                .collection(name)
                .limit(400)
                .get();

        if (snap.empty) {
            break;
        }

        deleted +=
            await deleteDocsInSnapshot(
                snap
            );
    }

    return deleted;
}


async function deleteCollectionWithSubcollection(
    collectionName,
    subcollectionName
) {
    let parentDeleted = 0;
    let childDeleted = 0;

    while (true) {
        const snap =
            await db()
                .collection(
                    collectionName
                )
                .limit(200)
                .get();

        if (snap.empty) {
            break;
        }

        for (
            const doc
            of snap.docs
        ) {
            if (
                subcollectionName
            ) {
                childDeleted +=
                    await deleteSubcollection(
                        doc.ref,
                        subcollectionName
                    );
            }
        }

        parentDeleted +=
            await deleteDocsInSnapshot(
                snap
            );
    }

    return {
        parentDeleted,
        childDeleted,
    };
}


async function deletePlainCollection(
    collectionName
) {
    let deleted = 0;

    while (true) {
        const snap =
            await db()
                .collection(
                    collectionName
                )
                .limit(400)
                .get();

        if (snap.empty) {
            break;
        }

        deleted +=
            await deleteDocsInSnapshot(
                snap
            );
    }

    return deleted;
}


// ============================================================
// CONTADORES
// ============================================================

async function getCounts() {
    const [
        contracts,
        versions,
        assignments,
        aiChats,
        users,
    ] = await Promise.all([
        db()
            .collection("contracts")
            .get(),

        db()
            .collection(
                "contracts_version"
            )
            .get(),

        db()
            .collection("assignments")
            .get(),

        db()
            .collection(
                "ai_contract_chats"
            )
            .get(),

        db()
            .collection("users")
            .get(),
    ]);

    const clients =
        users.docs.filter(
            (doc) =>
                String(
                    doc.data()
                        .role || ""
                ).toUpperCase() ===
                "CLIENT"
        ).length;

    const admins =
        users.docs.filter(
            (doc) =>
                String(
                    doc.data()
                        .role || ""
                ).toUpperCase() ===
                "ADMIN"
        ).length;

    return {
        contracts:
            contracts.size,

        versions:
            versions.size,

        assignments:
            assignments.size,

        aiChats:
            aiChats.size,

        users:
            users.size,

        clients,

        admins,
    };
}


// ============================================================
// ELIMINAR CLIENTES EXISTENTES
// ============================================================

async function removeExistingClients() {
    const snap =
        await db()
            .collection("users")
            .where(
                "role",
                "==",
                "CLIENT"
            )
            .get();

    let deleted = 0;

    for (
        const doc
        of snap.docs
    ) {
        const id =
            doc.id;

        await passwordTokensService
            .deleteAllForUser(id);

        await signatureTokensService
            .deleteAllForClient(id);

        await usersService
            .deleteById(id);

        deleted += 1;
    }

    return deleted;
}


// ============================================================
// CREAR USUARIOS DEMO
// ============================================================

async function ensureDemoUser(
    data
) {
    const existing =
        await usersService
            .getByEmail(
                data.email
            );

    const password_hash =
        await hashPassword(
            DEMO_PASSWORD
        );

    const payload = {
        ...data,

        password_hash,

        must_change_password:
            false,

        status:
            "ACTIVE",

        last_login_at:
            null,

        invited_at:
            null,

        invited_by_user_id:
            null,

        activated_at:
            new Date()
                .toISOString(),

        consent_record:
            null,

        rfc:
            data.rfc ??
            null,

        curp:
            data.curp ??
            null,

        phone:
            data.phone ??
            null,

        address_line1:
            data.address_line1 ??
            null,

        address_line2:
            data.address_line2 ??
            null,

        address_city:
            data.address_city ??
            null,

        address_state:
            data.address_state ??
            null,

        address_zip:
            data.address_zip ??
            null,

        address_country:
            data.address_country ??
            "MX",

        profile_completed:
            data.profile_completed ??
            true,
    };

    if (existing) {
        return usersService.patch(
            existing.id,
            payload
        );
    }

    return usersService.create(
        payload
    );
}


// ============================================================
// CREAR CONTRATOS DEMO
// ============================================================

async function createDemoContract(
    template,
    admin
) {
    const normalizedHtml =
        String(
            template.html
        ).trim();

    const {
        used_placeholders,
    } =
        validatePlaceholdersOrThrow(
            normalizedHtml
        );

    const created =
        await contractsService
            .createContract({
                created_by:
                    admin.id,

                created_by_name:
                    admin.name,

                title:
                    template.title,

                area:
                    template.area,

                position:
                    template.position,

                base_template_html:
                    normalizedHtml,

                initial_commit_message:
                    "Plantilla preparada para demostración SEAL",
            });

    return contractsService
        .updateContract(
            created.id,
            {
                base_placeholders_used:
                    used_placeholders,

                duration:
                    template.duration,

                legal_representative_name:
                    "Mariana López García",

                start_date:
                    "01/09/2026",

                end_date:
                    template.position ===
                    "QA Tester"
                        ? "30/11/2026"
                        : "No aplica",

                salary:
                    template.salary,

                work_schedule:
                    "Lunes a viernes de 09:00 a 18:00 horas, con descansos aplicables",
            }
        );
}


// ============================================================
// MAIN
// ============================================================

async function main() {
    /*
     * Inicializa Firebase usando la
     * configuración actual de Back/.env.
     */
    initFirebase();


    console.log("");
    console.log(
        "======================================"
    );

    console.log(
        " SEAL · PREPARACIÓN DE DEMOSTRACIÓN"
    );

    console.log(
        "======================================"
    );

    console.log("");


    // --------------------------------------------------------
    // Validar password
    // --------------------------------------------------------

    if (!DEMO_PASSWORD) {
        console.error(
            "ERROR: falta DEMO_PASSWORD en Back/.env"
        );

        console.error("");

        console.error(
            "Agrega por ejemplo:"
        );

        console.error(
            "DEMO_PASSWORD=<define-una-clave-segura>"
        );

        process.exit(1);
    }


    console.log(
        "Modo:",
        APPLY
            ? "APLICAR CAMBIOS"
            : "SOLO VISTA PREVIA"
    );

    console.log(
        "Eliminar CLIENT existentes:",
        DELETE_CLIENTS
            ? "SÍ"
            : "NO"
    );

    console.log("");


    // --------------------------------------------------------
    // Contar datos actuales
    // --------------------------------------------------------

    const before =
        await getCounts();

    console.log(
        "Estado actual de Firebase:"
    );

    console.log(
        before
    );


    // --------------------------------------------------------
    // DRY RUN
    // --------------------------------------------------------

    if (!APPLY) {
        console.log("");

        console.log(
            "No se modificó Firebase."
        );

        console.log("");

        console.log(
            "Para aplicar el reset conservando clientes:"
        );

        console.log(
            "node src/scripts/prepareDemoData.js --apply"
        );

        console.log("");

        console.log(
            "Para eliminar también los CLIENT actuales:"
        );

        console.log(
            "node src/scripts/prepareDemoData.js --apply --delete-clients"
        );

        console.log("");

        console.log(
            "Las cuentas ADMIN existentes NO se eliminan."
        );

        process.exit(0);
    }


    // ========================================================
    // 1. EXPEDIENTES
    // ========================================================

    console.log("");
    console.log(
        "1) Eliminando expedientes y sus mensajes..."
    );

    const assignmentDelete =
        await deleteCollectionWithSubcollection(
            "assignments",
            "messages"
        );

    console.log(
        assignmentDelete
    );


    // ========================================================
    // 2. TOKENS DE FIRMA
    // ========================================================

    console.log("");
    console.log(
        "2) Eliminando tokens de firma antiguos..."
    );

    const signatureTokensDeleted =
        await deletePlainCollection(
            "signature_tokens"
        );

    console.log({
        signatureTokensDeleted,
    });


    // ========================================================
    // 3. CHATS IA
    // ========================================================

    console.log("");
    console.log(
        "3) Eliminando conversaciones de IA antiguas..."
    );

    const aiDelete =
        await deleteCollectionWithSubcollection(
            "ai_contract_chats",
            "messages"
        );

    console.log(
        aiDelete
    );


    // ========================================================
    // 4. DRAFTS DE CONTRATOS
    // ========================================================

    console.log("");
    console.log(
        "4) Eliminando borradores de contratos..."
    );

    const contractSnapshot =
        await db()
            .collection(
                "contracts"
            )
            .get();

    let draftsDeleted =
        0;

    for (
        const doc
        of contractSnapshot.docs
    ) {
        draftsDeleted +=
            await deleteSubcollection(
                doc.ref,
                "drafts"
            );
    }

    console.log({
        draftsDeleted,
    });


    // ========================================================
    // 5. CONTRATOS
    // ========================================================

    console.log("");
    console.log(
        "5) Eliminando plantillas/contratos actuales..."
    );

    const contractsDeleted =
        await deletePlainCollection(
            "contracts"
        );

    console.log({
        contractsDeleted,
    });


    // ========================================================
    // 6. VERSIONES
    // ========================================================

    console.log("");
    console.log(
        "6) Eliminando versiones antiguas..."
    );

    const versionsDeleted =
        await deletePlainCollection(
            "contracts_version"
        );

    console.log({
        versionsDeleted,
    });


    // ========================================================
    // 7. CLIENTES
    // ========================================================

    if (DELETE_CLIENTS) {
        console.log("");
        console.log(
            "7) Eliminando usuarios CLIENT actuales..."
        );

        const clientsDeleted =
            await removeExistingClients();

        console.log({
            clientsDeleted,
        });
    } else {
        console.log("");
        console.log(
            "7) Los usuarios CLIENT actuales se conservaron."
        );
    }


    // ========================================================
    // 8. USUARIOS DEMO
    // ========================================================

    console.log("");
    console.log(
        "8) Creando usuarios de demostración..."
    );

    const seededUsers = {};


    for (
        const user
        of DEMO_USERS
    ) {
        const created =
            await ensureDemoUser(
                user
            );

        seededUsers[
            user.email
        ] = created;

        console.log(
            `- ${created.role}: ${created.name} <${created.email}>`
        );
    }


    const demoAdmin =
        seededUsers[
            "admin.demo@seal.test"
        ];


    // ========================================================
    // 9. PLANTILLAS
    // ========================================================

    console.log("");
    console.log(
        "9) Creando plantillas profesionales..."
    );

    const contracts =
        [];


    for (
        const template
        of DEMO_TEMPLATES
    ) {
        const created =
            await createDemoContract(
                template,
                demoAdmin
            );

        contracts.push(
            created
        );

        console.log(
            `- ${created.title}`
        );
    }


    // ========================================================
    // 10. EXPEDIENTE PREPARADO
    // ========================================================

    console.log("");
    console.log(
        "10) Creando expediente de demostración..."
    );


    const frontendClient =
        seededUsers[
            "ana.frontend@seal.test"
        ];


    const frontendContract =
        contracts.find(
            (contract) =>
                contract.position ===
                "Desarrollador Frontend"
        );


    if (
        !frontendClient ||
        !frontendContract
    ) {
        throw new Error(
            "No fue posible localizar el usuario o contrato Frontend para crear el expediente demo."
        );
    }


    const demoAssignment =
        await assignmentsService
            .createAssignment({
                created_by:
                    demoAdmin.id,

                created_by_name:
                    demoAdmin.name,

                client_id:
                    frontendClient.id,

                contract_id:
                    frontendContract.id,

                contract_version:
                    1,

                initial_message:
                    "Hola Ana. Te comparto este contrato de demostración para que revises sus condiciones, consultes el asistente IA y pruebes el flujo de firma en SEAL.",

                company_values: {
                    "company.title":
                        frontendContract.title,

                    "company.area":
                        frontendContract.area,

                    "company.position":
                        frontendContract.position,

                    "company.duration":
                        "Por tiempo indefinido",

                    "company.legal_representative_name":
                        "Mariana López García",

                    "company.start_date":
                        "01/09/2026",

                    "company.salary":
                        "$32,000 MXN mensuales brutos",

                    "company.work_schedule":
                        "Lunes a viernes de 09:00 a 18:00 horas, con descansos aplicables",
                },
            });


    console.log(
        `- Expediente creado: ${demoAssignment.id}`
    );


    // ========================================================
    // RESULTADO FINAL
    // ========================================================

    const after =
        await getCounts();


    console.log("");
    console.log(
        "======================================"
    );

    console.log(
        " DEMOSTRACIÓN PREPARADA"
    );

    console.log(
        "======================================"
    );

    console.log("");


    console.log(
        "Estado final:"
    );

    console.log(
        after
    );


    console.log("");
    console.log(
        "USUARIOS DE DEMOSTRACIÓN"
    );

    console.log(
        "--------------------------------------"
    );

    console.log(
        "ADMIN:"
    );

    console.log(
        "admin.demo@seal.test"
    );


    console.log("");

    console.log(
        "CLIENTE FRONTEND:"
    );

    console.log(
        "ana.frontend@seal.test"
    );


    console.log("");

    console.log(
        "CLIENTE BACKEND:"
    );

    console.log(
        "luis.backend@seal.test"
    );


    console.log("");

    console.log(
        "CLIENTE QA:"
    );

    console.log(
        "sofia.qa@seal.test"
    );


    console.log("");

    console.log(
        "Todos utilizan la contraseña definida en DEMO_PASSWORD."
    );


    console.log("");
    console.log(
        "PLANTILLAS:"
    );

    for (
        const contract
        of contracts
    ) {
        console.log(
            `- ${contract.title}`
        );
    }


    console.log("");
    console.log(
        "EXPEDIENTE PREPARADO:"
    );

    console.log(
        `Ana Torres Demo → ${frontendContract.title}`
    );


    console.log("");
    console.log(
        "ORDEN SUGERIDO PARA LA DEMO:"
    );

    console.log(
        "1. Entrar como admin.demo@seal.test"
    );

    console.log(
        "2. Mostrar las plantillas profesionales"
    );

    console.log(
        "3. Usar IA Plantillas para crear o modificar una"
    );

    console.log(
        "4. Abrir el expediente de Ana"
    );

    console.log(
        "5. Preguntar a la IA: Resume los puntos importantes de este contrato"
    );

    console.log(
        "6. Cerrar sesión"
    );

    console.log(
        "7. Entrar como ana.frontend@seal.test"
    );

    console.log(
        "8. Mostrar revisión, chat, IA y firma"
    );

    console.log(
        "9. Volver al administrador y aprobar"
    );

    console.log("");
}


// ============================================================
// EJECUCIÓN
// ============================================================

main()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error("");
        console.error(
            "ERROR preparando la demostración:"
        );

        console.error(
            error
        );

        process.exit(1);
    });
