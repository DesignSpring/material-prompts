# Material Prompts — OzCHI 2026

A responsive, accessible workshop website for **Material Prompts: Exploring Human–AI Interaction in Emerging Robotic Fabrication Contexts**. Built with plain HTML and CSS; no installation, build process or external libraries are needed.

## Publish on GitHub Pages

In this repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, then **main** and **/(root)**, and save.

The expected address is https://designspring.github.io/material-prompts/ once Pages is enabled and its deployment succeeds.

GitHub's setup guide: https://docs.github.com/en/pages/quickstart

## Edit the site

- `index.html` contains all workshop text, programme entries, organiser profiles and application buttons.
- `style.css` controls typography, colours and mobile layouts.
- Both application buttons link to https://forms.cloud.microsoft/r/SnEC7xNbmc. Replace both URLs when changing the form.
- The linked application form supplies the tentative date (22 November 2026), Adelaide University City East Campus location and Griffith contact email. Its date typo “206” has been interpreted as 2026, matching the conference year. The room remains **to be confirmed**. The application deadline (12 November 2026), notification timing (before 20 November 2026) and provisional programme come from the supplied Rev2 proposal.
- Acceptance status is not asserted. Confirm event details with the organisers before changing these labels.
- No custom domain is configured. `materialprompts.com` can be connected later after ownership and DNS access are confirmed.

## Preview locally

Open `index.html` in a browser, or run `python -m http.server 8000` in this folder and visit http://localhost:8000.

## Content and design

Workshop content is adapted from the organiser-provided *Material Prompts_Rev2.pdf* and *Supplementary workshop information_Rev2.pdf*. The original PDFs are not published by this repository.

The layout takes inspiration from the supplied Designing through Becoming workshop site, with an original implementation and Material Prompts content. There are no copied photographs or third-party scripts.
