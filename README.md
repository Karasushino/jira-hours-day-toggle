# Jira Hours / Days Toggle

A Tampermonkey userscript that displays Jira sprint and backlog estimates in hours by default, then toggles them to workdays when you click an estimate badge or the sprint summary badge group.

## Features

- Normalizes supported estimates to hours when the Jira page loads, including estimates Jira adds or reformats later.
- Clicking a sprint summary badge group or a supported estimate badge switches the sprint and backlog estimates between hours and days.
- Clicking again switches them back to hours.
- Preserves existing badge tooltips and appends a hint for the next toggle.
- Handles compound and slash-separated estimates, such as `1w 2d` and `80h/216h`.

## Install

1. Install the [Tampermonkey browser extension](https://www.tampermonkey.net/).
2. Open `jira-hours-days-toggle.user.js` in the GitHub repository and select **Raw**. Tampermonkey should offer to install the userscript.
3. Confirm the installation, make sure the script is enabled, and refresh your Jira page.

To install from a local copy instead, open the Tampermonkey dashboard, create a new script, paste in the contents of `jira-hours-days-toggle.user.js`, and save it.

## Use

On a supported Jira backlog/board page, estimate badges are shown in hours after the page loads. Click the sprint summary badge group or one of its estimate badges to show estimates in days. Clicking an estimate badge in the backlog also toggles the sprint and backlog estimates together.

The tooltip includes a hint about what the next click will do.

## Restrict the script to your Jira site

The userscript includes a broad `@match` by default. You can override it through Tampermonkey without editing the userscript source:

1. Open the Tampermonkey **Dashboard** from the extension popup.
2. In the installed scripts list, click the **Jira Hours / Days Toggle** script name to open its details. The **Settings** tab is inside this details view; it is not in the extension popup.
3. Open **Settings**, then find the **Includes/Excludes** section.
4. Disable **Original Matches** so the broad `*://*/*` rule no longer applies.
5. In **User Matches**, click **Add...** and enter your Jira URL, for example `https://jira.example.com/*`.
6. Confirm the rule and refresh Jira.

Use your Jira hostname in place of `jira.example.com`. For both HTTP and HTTPS, use `*://jira.example.com/*`.

## Conversion

The script uses standard Jira work-time assumptions:

- `1d` = 8 hours
- `1w` = 5 workdays (40 hours)
- `1h` = 1 hour
- `1m` = 1 minute

Slash-separated values are converted on each side independently. For example, `80h/216h` becomes `10d/27d`. Values the script cannot parse are left unchanged and reported in the browser console.

## Site permissions

Tampermonkey's **User Matches** setting controls where the script is injected. The userscript itself makes no network requests.
