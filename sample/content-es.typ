#let content = (
  labels: (
    about: "Sobre Mí",
    experience: "Experiencia",
    skills: "Habilidades",
    projects: "Proyectos",
    languages: "Idiomas",
    education: "Educación",
  ),

  about: [
    Soy frontend developer con 4.5 años de experiencia construyendo un editor y renderizador de gráficos de transmisión en tiempo real con React y TypeScript, cuya salida se emite en vivo al aire. Responsable a largo plazo de líneas de funcionalidades core (motor de animación de tickers/crawlers, sistema de data-binding), con historial de extraer lógica de UI stateful compleja en módulos de TypeScript puro cubiertos por tests unitarios.
  ],

  jobs: (
    (
      position: "Software Engineer II",
      institution: [Flowics (adquirida por Vizrt)],
      date: "2021 - 2026",
      location: "Argentina",
      description: [

        Editor y renderizador de gráficos de transmisión en tiempo real (React, TypeScript, Node.js) utilizado para producción en vivo en sitio.
        - Responsable del motor de animación de tickers/crawlers durante más de 3 años: reescribí su núcleo para eliminar un defecto de gap visible al aire que había resistido soluciones incrementales; extraje la lógica de negocio y prefetching en clases manager de TypeScript puro con cobertura completa de Jest.
        - Construí el selector jerárquico de data-binding (TreeRenderer) y su modal de binding — navegación en árbol, resaltado de búsqueda, controles de índice — lo hice usable con esquemas de proveedores grandes mediante virtualización de listas y comparadores memoizados; reescribí el motor de paths subyacente para cumplir totalmente con JSON Pointer RFC 6901.
        - Entregué una funcionalidad de gestión de fuentes self-serve en dos codebases: UI de carga múltiple de archivos con parsing de fuentes en el cliente, respaldada por una API REST bulk usando transacciones de MongoDB y concurrencia optimista, manteniendo soporte para el flujo legacy.
      ],
    ),
  ),

  //deprecated
  skills: [TypeScript, JavaScript, React (hooks y class components, context, memoization, React Profiler), Redux, redux-saga, reselect, Canvas API, Jest, Cypress, Storybook, Node.js (Hapi, Express), MongoDB, parsing de formatos de archivo, parsing de fuentes, Java, Python, Ruby, Docker, Git, GitHub Actions, GitLab Pipelines, SQL, Godot, Jira],

  projects: (
    (
      title: [Web App de Escena 3D Interactiva],
      date: [2025],
      description: [
        - Desarrollé una escena 3D con una isla y un avión, jugable desde el navegador.
        - El terreno está generado proceduralmente a partir de un heightmap, texturizado con shaders basados en las formas y alturas de la malla generada.
      ],
    ),
    (
      title: [D&D Battle Tracker (proyecto de curso)],
      date: [2021],
      description: [
        - Diseñé íconos y layouts de UI personalizados en Adobe XD y los implementé exitosamente en Android Studio.
        - Trabajé en un equipo de tres personas para desarrollar una aplicación Android para el seguimiento de combates de D&D, con creación de personajes y gestión de estado en tiempo real.
      ],
    ),
  ),

  languages: (
    (title: "Español", content: "Nativo"),
    (title: "Inglés", content: "Fluido"),
  ),

  education: (
    (
      institution: [Instituto Tecnológico de Buenos Aires],
      major: [Ingeniería en Informática],
      location: "Argentina",
      date: "2017 - 2027",
    ),
  ),
)
