# Functional Description
## Name: Codegen Web App
## General Description
This is a web application that allows users to generate websites using AI.

## Pages
- Landing Page
  - The landing page has a chatbox where the user can send an initial prompt to the ai.
  - The landing page shows all existing projects so that the user can enter an old project.

- Project Page
  - The project page has a chatbox showing the conversation history.
  - The project page has a textbox where the user can send a message to the ai.
  - The project page has a preview box of the generated website.

## Flow
- The user start by entering a promot in the chatbox on the landing page. This creates a new project and starts the chat of with that prompt.
- After every prompt/code edit the agent regenerates the preview website
- If a user enters a preview project the chat history and preview website is loaded.
