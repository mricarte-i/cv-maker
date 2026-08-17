#let content = (
  labels: (
    about: "About Me",
    experience: "Experience",
    skills: "Skills",
    projects: "Projects",
    languages: "Languages",
    education: "Education",
  ),

  about: [
    I'm a frontend engineer with 4.5 years building a real-time broadcast graphics editor and renderer in React and TypeScript, where output runs live on air. Long-term owner of core feature lines (ticker/crawler animation engine, data-binding system), with a track record of extracting complex stateful UI logic into unit-tested plain-TypeScript modules
  ],

  jobs: (
    (
      position: "Software Engineer II",
      institution: [Flowics (acquired by Vizrt)],
      date: "2021 - 2026",
      location: "Argentina",
      description: [

        Real-time broadcast graphics editor and renderer (React, Typescript, Node.js) used for live on-site production.
        - Owned the ticker/crawler animation engine for 3+ years: rewrote its core to eliminate on-air visible gap defect that had resisted incremental fixes; extracted business and prefetching logic into plain-TypeScript manager classes with full Jest coverage.
        - Built the hierarchical data-binding picker (TreeRenderer) and binding modal — tree navigation, search highlighting, index controls — made it usable with large provider schemas via list virtualization and memoized comparators; rewrote the underlying path engine to full JSON Pointer RFC 6901 compliance.
        - Shipped a self-serve font management feature across two codebases: multi-file upload UI with client-side font parsing backed by a bulk REST API using MongoDB transactions and optimistic concurrency while supporting the legacy workflow.
      ],
    ),
  ),

  //deprecated
  skills: [TypeScript, JavaScript, React (hooks and class components, context, memoization, React Profiler), Redux, redux-saga, reselect, Canvas API, GSAP, CSS animations, Jest, Cypress, Storybook, Node.js (Hapi, Express), MongoDB, file-format parsing, font parsing, Java, Python, Ruby, Docker, Git, GitHub Actions, GitLab Pipelines, SQL, Godot, Jira],

  projects: (
    (
      title: [Interactive 3D Scene Web App],
      date: [2025],
      description: [
        - Developed a 3D scene with an island and airplane, playable from the browser.
        - The terrain is made procedurally based on a heightmap, textured using shaders based on the shapes and heights of the generated mesh.
      ],
    ),
    (
      title: [D&D Battle Tracker App (course project)],
      date: [2021],
      description: [
        - Designed custom UI icons and layouts in Adobe XD and successfully implemented them within Android Studio.
        - Worked in a team of three to develop an Android application for tracking D&D combat, featuring character creation and real-time status management.
      ],
    ),
  ),

  languages: (
    (title: "Spanish", content: "Native"),
    (title: "English", content: "Fluent"),
  ),

  education: (
    (
      institution: [Instituto Tecnológico de Buenos Aires],
      major: [Software Engineering],
      location: "Argentina",
      date: "2017 - 2027",
    ),
  ),
)
