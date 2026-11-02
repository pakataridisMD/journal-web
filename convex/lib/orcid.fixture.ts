/** Trimmed from a v3.0 public record (GET /v3.0/{iD}/record, JSON), sample values. */
export const SAMPLE_RECORD = {
  "orcid-identifier": { uri: "https://orcid.org/0000-0002-1825-0097", path: "0000-0002-1825-0097", host: "orcid.org" },
  person: {
    name: {
      "given-names": { value: "Ana" },
      "family-name": { value: "Ruiz" },
      "credit-name": { value: "Ana M. Ruiz" },
      visibility: "public",
    },
    biography: { content: "  Geriatrician working on   falls and frailty.\n", visibility: "public" },
    "researcher-urls": {
      "researcher-url": [
        { "url-name": "LinkedIn", url: { value: "https://www.linkedin.com/in/ana-ruiz/" } },
        { "url-name": "Lab", url: { value: "https://geriatrics.example.edu/ruiz" } },
        { "url-name": "Scholar", url: { value: "https://scholar.google.co.uk/citations?user=AbCdEfGhIjKl&hl=en" } },
        { "url-name": "Bad", url: { value: "javascript:alert(1)" } },
      ],
    },
    keywords: { keyword: [{ content: "frailty" }, { content: "falls" }, { content: "frailty" }] },
    "external-identifiers": {
      "external-identifier": [
        {
          "external-id-type": "Scopus Author ID",
          "external-id-value": "57190000000",
          "external-id-url": { value: "http://www.scopus.com/inward/authorDetails.url?authorID=57190000000&partnerID=MN8TOARS" },
        },
        { "external-id-type": "ResearcherID", "external-id-value": "A-1234-2010", "external-id-url": null },
      ],
    },
  },
  "activities-summary": {
    employments: {
      "affiliation-group": [
        {
          summaries: [
            {
              "employment-summary": {
                "department-name": "Department of Geriatric Medicine",
                "role-title": "Consultant",
                "start-date": { year: { value: "2012" }, month: { value: "09" }, day: null },
                "end-date": null,
                organization: { name: "Northfield General Hospital", address: { city: "Leeds", region: null, country: "GB" } },
              },
            },
          ],
        },
        {
          summaries: [
            {
              "employment-summary": {
                "department-name": null,
                "role-title": "Registrar",
                "start-date": { year: { value: "2006" } },
                "end-date": { year: { value: "2012" } },
                organization: { name: "Harbor University Hospital", address: { city: "Bristol", country: "GB" } },
              },
            },
          ],
        },
      ],
    },
    educations: {
      "affiliation-group": [
        {
          summaries: [
            {
              "education-summary": {
                "role-title": "MD",
                "start-date": { year: { value: "1998" } },
                "end-date": { year: { value: "2004" } },
                organization: { name: "University of Example", address: { city: "London", country: "GB" } },
              },
            },
          ],
        },
      ],
    },
    works: {
      group: [
        {
          "work-summary": [
            {
              "put-code": 1,
              title: { title: { value: "Falls after hip fracture: a cohort study" } },
              "external-ids": {
                "external-id": [
                  { "external-id-type": "doi", "external-id-value": "https://doi.org/10.1000/falls.2019", "external-id-relationship": "self" },
                ],
              },
              type: "journal-article",
              "publication-date": { year: { value: "2019" } },
              "journal-title": { value: "Age and Ageing" },
            },
            { title: { title: { value: "Duplicate from another source" } } },
          ],
        },
        {
          "work-summary": [
            {
              title: { title: { value: "Frailty screening in primary care" } },
              "external-ids": { "external-id": [] },
              url: { value: "https://example.org/frailty" },
              type: "journal-article",
              "publication-date": { year: { value: "2023" }, month: { value: "02" } },
              "journal-title": null,
            },
          ],
        },
        { "work-summary": [{ title: null }] },
      ],
    },
  },
};
