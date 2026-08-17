export const CV_TYP = `
#import "/silver-dev-cv.typ": *
#let t = json("/content.json")

#let render-blocks(bs) = {
  for b in bs {
    if b.kind == "bullets" {
      list(..b.items)
    } else {
      par(b.text)
    }
  }
}

#let render-item(it) = {
  if it.kind == "entry" {
    job(position: it.title, institution: it.subtitle,
      date: it.date, location: it.location,
      description: render-blocks(it.body)
    )
  } else if it.kind == "oneline" {
    oneline-title-item(title: it.title, content: it.content)
  } else {
    descript(render-blocks(it.body))
  }
}

#show: cv.with(
  font-type: "Libertinus Serif",
  name: t.name,
  address: t.address,
  date: t.date,
  contacts: t.contacts,
  continue-header: "false",
  lastupdated: "true",
  pagecount: "true",
)

#for s in t.sections {
  section(s.label)
  for it in s.items {
    render-item(it)
  }
  sectionsep
}
`;

export const SAMPLE = {
  schemaVersion: 1,
  name: "Matias Ricarte",
  address: "Buenos Aires, Argentina",
  date: "2026-08-17",
  contacts: [
    { text: "LinkedIn", link: "http://linkedin.com/in/matiasricarte/" },
    { text: "Github", link: "http://github.com/mricarte-i" },
  ],
  sections: [
    {
      id: "s1",
      label: "About",
      items: [
        {
          kind: "prose",
          id: "i1",
          body: [
            {
              kind: "paragraph",
              text: "Frontend engineer. Chars that must stay inert: # [ ] * _ @ - and an em—dash.",
            },
          ],
        },
      ],
    },
    {
      id: "s2",
      label: "Experience",
      items: [
        {
          kind: "entry",
          id: "i2",
          variant: "job",
          title: "Software Engineer II",
          subtitle: "Flowics (acquired by Vizrt)",
          date: "2021 - 2026",
          location: "Argentina",
          body: [
            {
              kind: "bullets",
              items: [
                "Owned the ticker/crawler animation engine for 3+ years.",
                "Built the hierarchical data-binding picker (TreeRenderer).",
              ],
            },
          ],
        },
      ],
    },
    {
      id: "s3",
      label: "Languages",
      items: [
        { kind: "oneline", id: "i3", title: "Spanish", content: "Native" },
        { kind: "oneline", id: "i4", title: "English", content: "Fluent" },
      ],
    },
  ],
};
