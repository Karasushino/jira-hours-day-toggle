// ==UserScript==
// @name         Jira Hours / Days Toggle
// @namespace    local.jira-hours-days-toggle
// @version      1.0.0
// @description  Toggle the Jira sprint estimate badge between hours and 8-hour days.
// @match        *://*/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const sprintSelector =
        '#ghx-content-group > div.ghx-sprint-group > ' +
        'div.ghx-backlog-container.ghx-sprint-active.js-sprint-container.ghx-open.ui-droppable';
    const backlogSelector =
        '#ghx-content-group > div.ghx-backlog-group > ' +
        'div.ghx-backlog-container.ghx-open.ghx-everything-else.ui-droppable';
    const groupSelector =
        'div.ghx-backlog-header.js-sprint-header > div.ghx-badge-group.ghx-right';
    const summaryBadgeSelector =
        'aui-badge.ghx-not-started, aui-badge.ghx-in-progress, aui-badge.ghx-done';
    const statisticBadgeSelector = 'aui-badge.ghx-statistic-badge';
    const issueEstimateSelector =
        'div.ghx-meta.ghx-disabled > div > div:nth-child(2) > ' +
        'div.ghx-issue-content > div:nth-child(1) > ' +
        'span.ghx-end.ghx-estimate > aui-badge';
    const inlineEstimateSelector =
        'div.ghx-meta.ghx-disabled.plan-inline-create-inside aui-badge';
    const backlogEstimateSelector =
        'div.ghx-issues.js-issue-list.ghx-has-issues ' +
        'div.ghx-issue-content span.ghx-end.ghx-estimate > aui-badge';
    const originals = new WeakMap();
    const originalTitles = new WeakMap();

    function estimatesIn(sprint) {
        const estimates = new Set();
        const group = sprint.querySelector(groupSelector);

        if (group) {
            group.querySelectorAll(summaryBadgeSelector).forEach(function (badge) {
                estimates.add(badge);
            });
        }

        sprint.querySelectorAll(statisticBadgeSelector).forEach(function (badge) {
            estimates.add(badge);
        });

        sprint.querySelectorAll(issueEstimateSelector).forEach(function (badge) {
            estimates.add(badge);
        });

        const sprintGroup = sprint.parentElement;
        if (sprintGroup) {
            sprintGroup.querySelectorAll(inlineEstimateSelector).forEach(function (badge) {
                estimates.add(badge);
            });
        }

        const backlog = document.querySelector(backlogSelector);
        if (backlog) {
            backlog.querySelectorAll(statisticBadgeSelector).forEach(function (badge) {
                estimates.add(badge);
            });
            backlog.querySelectorAll(backlogEstimateSelector).forEach(function (badge) {
                estimates.add(badge);
            });
        }

        return Array.from(estimates);
    }

    function setTooltip(element, hint) {
        let record = originalTitles.get(element);
        const currentTitle = element.getAttribute('title') || '';

        if (!record) {
            record = { original: currentTitle, applied: '' };
        } else if (currentTitle !== record.applied) {
            record.original = currentTitle;
        }

        record.applied = record.original ? record.original + '\n' + hint : hint;
        originalTitles.set(element, record);
        element.setAttribute('title', record.applied);
    }

    function updateGroupAffordance(sprint) {
        const group = sprint.querySelector(groupSelector);
        if (!group) {
            return;
        }

        const hint = sprint.getAttribute('data-jira-hours-days-mode') === 'days'
            ? 'Click to show hours'
            : 'Click to show days';

        group.style.cursor = 'pointer';
        setTooltip(group, hint);
        estimatesIn(sprint).forEach(function (badge) {
            badge.style.cursor = 'pointer';
            setTooltip(badge, hint);
        });
    }

    function parseDurationHours(text) {
        const scalarMatch = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)?$/i);
        if (scalarMatch) {
            return Number(scalarMatch[1]);
        }

        let hours = 0;
        let tokenCount = 0;
        const remaining = text.replace(
            /(\d+(?:\.\d+)?)\s*(weeks?|w|days?|d|hours?|hrs?|h|minutes?|mins?|m)/gi,
            function (token, amount, unit) {
                const normalizedUnit = unit.toLowerCase();
                const factor = /^w/.test(normalizedUnit) ? 40
                    : /^d/.test(normalizedUnit) ? 8
                        : /^m/.test(normalizedUnit) ? 1 / 60
                            : 1;
                hours += Number(amount) * factor;
                tokenCount += 1;
                return '';
            }
        );

        if (tokenCount === 0 || remaining.replace(/[\s,]+/g, '') !== '') {
            return null;
        }

        return hours;
    }

    function convertEstimate(text, formatter) {
        const parts = text.split(/(\s*\/\s*)/);
        for (let index = 0; index < parts.length; index += 2) {
            const hours = parseDurationHours(parts[index]);
            if (hours === null) {
                return null;
            }
            parts[index] = formatter(hours);
        }
        return parts.join('');
    }

    function formatDays(hours) {
        return (hours / 8).toFixed(2).replace(/\.?0+$/, '') + 'd';
    }

    function formatHours(hours) {
        return hours.toFixed(2).replace(/\.?0+$/, '') + 'h';
    }

    function applySprintMode(sprint) {
        let mode = sprint.getAttribute('data-jira-hours-days-mode');
        if (!mode) {
            mode = 'hours';
            sprint.setAttribute('data-jira-hours-days-mode', mode);
        }

        estimatesIn(sprint).forEach(function (badge) {
            if (mode === 'days') {
                let hoursText = originals.get(badge);
                if (hoursText === undefined) {
                    hoursText = convertEstimate(badge.textContent, formatHours);
                    if (hoursText === null) {
                        return;
                    }
                    originals.set(badge, hoursText);
                }

                const daysText = convertEstimate(hoursText, formatDays);
                if (daysText !== null && badge.textContent !== daysText) {
                    badge.textContent = daysText;
                }
                return;
            }

            const hoursText = convertEstimate(badge.textContent, formatHours);
            if (hoursText !== null && badge.textContent !== hoursText) {
                badge.textContent = hoursText;
            }
            originals.delete(badge);
        });
    }

    function prepareGroups(root) {
        const sprints = new Set();
        if (root instanceof Element) {
            const containingSprint = root.closest(sprintSelector);
            if (containingSprint) {
                sprints.add(containingSprint);
            }
            if (root.matches('aui-badge') || root.querySelector('aui-badge')) {
                const activeSprint = document.querySelector(sprintSelector);
                if (activeSprint) {
                    sprints.add(activeSprint);
                }
            }
        }

        root.querySelectorAll(sprintSelector).forEach(function (sprint) {
            sprints.add(sprint);
        });
        sprints.forEach(function (sprint) {
            applySprintMode(sprint);
            updateGroupAffordance(sprint);
        });
    }

    prepareGroups(document);
    new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.target instanceof Element) {
                prepareGroups(mutation.target);
            } else if (mutation.target.parentElement) {
                prepareGroups(mutation.target.parentElement);
            }
            if (mutation.type === 'attributes' && mutation.target instanceof Element) {
                prepareGroups(mutation.target);
            }
            mutation.addedNodes.forEach(function (node) {
                if (node instanceof Element) {
                    prepareGroups(node);
                }
            });
        });
    }).observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class']
    });

    document.addEventListener('click', function (event) {
        if (!(event.target instanceof Element)) {
            return;
        }

        const clickedBadge = event.target.closest('aui-badge');
        let sprint = event.target.closest(sprintSelector);
        if (!sprint && clickedBadge) {
            const activeSprint = document.querySelector(sprintSelector);
            if (activeSprint && estimatesIn(activeSprint).includes(clickedBadge)) {
                sprint = activeSprint;
            }
        }
        if (!sprint) {
            return;
        }

        const group = sprint.querySelector(groupSelector);
        const estimatesInSprint = estimatesIn(sprint);
        if (!group || (!event.target.closest(groupSelector) &&
            !estimatesInSprint.includes(clickedBadge))) {
            return;
        }

        const showHours = sprint.getAttribute('data-jira-hours-days-mode') === 'days';
        const estimates = [];
        estimatesInSprint.forEach(function (badge) {
            const original = originals.get(badge);
            const text = badge.textContent;
            const source = showHours && original !== undefined ? original : text;
            const converted = convertEstimate(source, showHours ? formatHours : formatDays);
            if (converted === null) {
                console.warn(
                    'Jira Hours / Days Toggle: skipping unsupported badge text:',
                    text
                );
                return;
            }

            estimates.push({
                badge: badge,
                text: text,
                original: original,
                converted: converted
            });
        });
        if (estimates.length === 0) {
            return;
        }

        estimates.forEach(function (estimate) {
            if (showHours) {
                estimate.badge.textContent = estimate.converted;
                originals.delete(estimate.badge);
            } else {
                originals.set(estimate.badge, estimate.text);
                estimate.badge.textContent = estimate.converted;
            }
        });

        sprint.setAttribute('data-jira-hours-days-mode', showHours ? 'hours' : 'days');
        updateGroupAffordance(sprint);
    }, true);
})();
