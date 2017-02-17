# Gnome Shell Extensions

This is the home of my extensions for the Gnome Shell.

* [workspace-indicator-extended](/tree/master/workspace-indicator-extended/) - Extended fork of original Gnome Workspace Indicator, which shows all workspaces

## Development notes

### Essential shortcuts

* `<alt><f2>` then `lg` opens the "Looking Glass" console
* `<alt><f2>` then `r` reloads the Gnome Shell (as of Feb.2017 not available in Wayland under Fedora 25)

### Logging

`journalctl /usr/bin/gnome-shell -f -o cat` (older version: journalctl /usr/bin/gnome-session -f -o cat)

Use in combination with `log('xyz')`, which is a shorthand for `global.log()`.
