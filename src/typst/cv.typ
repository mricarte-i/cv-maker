#import "/silver-dev-cv.typ": *

#let t = json("/content.json")

#set document(author: t.name, title: t.name + " — CV")

// ---------- blocks ----------
#let render-blocks(bs) = {
  for b in bs {
    if b.kind == "bullets" {
      if b.items.len() > 0 { list(..b.items) }
    } else if b.text.trim() != "" {
      par(b.text)
    }
  }
}

// ---------- entries: the branch ----------
#let render-entry(it) = {
  let body = render-blocks(it.body)

  if it.variant == "job" {
    job(
      position: it.title,
      institution: it.subtitle,
      location: it.location,
      date: it.date,
      description: body,
    )
  } else if it.variant == "education" {
    if it.location.trim() == "" {
      // education() hardcodes ", " between institution and location, so an
      // empty location leaves a dangling comma. Inline the same layout.
      text(11pt, fill: subheadings-colour, weight: "bold")[#it.title]
      h(1fr)
      text(11pt, style: "italic", fill: headings-colour)[#it.date \ ]
      text(11pt, style: "italic", fill: subheadings-colour, weight: "medium")[#it.subtitle \ ]
      body
    } else {
      education(
        institution: it.title,
        major: it.subtitle,
        location: it.location,
        date: it.date,
        description: body,
      )
    }
  } else {
    // project: no location, no subtitle
    project(title: it.title, date: it.date, description: body)
  }
}

#let render-item(it) = {
  if it.kind == "entry" {
    render-entry(it)
  } else if it.kind == "oneline" {
    oneline-title-item(title: it.title, content: it.content)
  } else {
    descript(render-blocks(it.body))
  }
}

// ---------- header ----------
// display() branches on `"link" in contact`, and our JSON always has the key.
// Drop it when empty so link("") never gets emitted.
#let contacts = t.contacts.map(c => if c.link.trim() != "" { (text: c.text, link: c.link) } else { (text: c.text) })

#show: cv.with(
  font-type: "Libertinus Serif",
  continue-header: "false",
  name: t.name,
  address: t.address,
  lastupdated: "true",
  date: t.date,
  contacts: contacts,
)

// ---------- body ----------
#for s in t.sections {
  section(s.label)
  for it in s.items { render-item(it) }
  sectionsep
}
