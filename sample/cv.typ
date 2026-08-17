#import "@preview/silver-dev-cv:1.0.2": *
#import "content-en.typ" as en
#import "content-es.typ" as es

// Pick language at compile time: typst compile --input lang=es cv.typ cv-es.pdf
// Defaults to English if not specified.
#let lang = sys.inputs.at("lang", default: "en")
#let t = if lang == "es" { es.content } else { en.content }

#show: cv.with(
  font-type: "Libertinus Serif", // "PT Serif",
  continue-header: "false",
  name: "Matias Ricarte",
  address: "Buenos Aires, Argentina",
  lastupdated: "true",
  pagecount: "true",
  date: "2026-07-10",
  contacts: (
    (text: "LinkedIn", link: "http://linkedin.com/in/matiasricarte/"),
    (text: "Github", link: "http://github.com/mricarte-i"),
    (text: "ricartematias1706@gmail.com", link: "mailto:ricartematias1706@gmail.com"),
  ),
)

// about
#section(t.labels.about)
#descript(t.about)

#sectionsep
// experience
#section(t.labels.experience)
#for j in t.jobs [
  #job(
    position: j.position,
    institution: j.institution,
    date: j.date,
    location: j.location,
    description: j.description,
  )
]

#section(t.labels.skills)
#oneline-title-item(
  title: t.labels.skills,
  content: [TypeScript, JavaScript, React (hooks and class components, context, memoization, React Profiler), Redux, redux-saga, reselect, Canvas API, GSAP, CSS animations, Jest, Cypress, Storybook, Node.js (Hapi, Express), MongoDB, file-format parsing, font parsing, Java, Python, Ruby, Docker, Git, GitHub Actions, GitLab Pipelines, SQL, Godot, Jira],
)

#sectionsep
#section(t.labels.projects)
#for p in t.projects [
  #project(
    title: p.title,
    date: p.date,
    description: p.description,
  )
]

#sectionsep
#section(t.labels.languages)
#for l in t.languages [
  #oneline-title-item(
    title: l.title,
    content: l.content,
  )
]

#sectionsep
#section(t.labels.education)
#for e in t.education [
  #education(
    institution: e.institution,
    major: e.major,
    location: e.location,
    date: e.date,
  )
]

#set document(author: "silver", title: "Silver CV Template")
