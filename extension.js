// -*- mode: js2; indent-tabs-mode: nil; js2-basic-offset: 4 -*-

/*
<alt>+<f2> lg -> looking glass console
<alt>+<f2> r  -> reload gnome shell

journalctl /usr/bin/gnome-shell -f -o cat
(früher: journalctl /usr/bin/gnome-session -f -o cat)
in verbindung mit log('xyz') (log() ist abküzrung für global.log()) 
*/

const Gio = imports.gi.Gio
const Meta = imports.gi.Meta
const Clutter = imports.gi.Clutter
const St = imports.gi.St
const Lang = imports.lang
const Mainloop = imports.mainloop
const PanelMenu = imports.ui.panelMenu
const PopupMenu = imports.ui.popupMenu
const Panel = imports.ui.panel

const Gettext = imports.gettext.domain('gnome-shell-extensions')
const _ = Gettext.gettext

const Main = imports.ui.main

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()
const Convenience = Me.imports.convenience

const WORKSPACE_SCHEMA = 'org.gnome.desktop.wm.preferences'
const WORKSPACE_KEY = 'workspace-names'

const WorkspaceIndicator = new Lang.Class({

  Name: 'WorkspaceIndicator.WorkspaceIndicator',

  Extends: PanelMenu.Button,

  _init: function()
  {
    this.parent(0.0, _('Workspace Indicator'))

    this.hbox = new St.BoxLayout({
      style_class: 'panel-status-menu-box'
    })

    // IDEA: option for hiding icon
    // IDEA: option for changing icon
    // TODO: smaller margin/border right for icon
    let icon = new St.Icon({
      icon_name: 'view-grid-symbolic',
      style_class: 'system-status-icon panel-workspace-indicator-icon',
    })
    this.hbox.add_child(icon)

    this.statusLabel = new St.Label({
      y_align: Clutter.ActorAlign.CENTER,
      text: this._getCurrentWorkspaceName(),
      style_class: 'panel-workspace-indicator-label'
      //width: 200 
    })
    this.hbox.add_child(this.statusLabel)

    // IDEA: option for hiding arrow icon
    this.hbox.add_child(PopupMenu.arrowIcon(St.Side.BOTTOM))

    //*
    // TOOD: buttons for each workspace directly on panel (UNFINISHED)
    this.statusButtons = []
    
    for (var i = 0; i < this._getWorkspaceCount(); i++)
    {
      let label = new St.Label({
        y_align: Clutter.ActorAlign.CENTER,
        text: this._getWorkspaceName(i),
        style_class: 'panel-workspace-indicator-label'
        //width: 200 
      })

      let button = new St.Button({
        child: label
      })

      this.statusButtons.push(button)

      let index = i
      button.connect('clicked', Lang.bind(this, function(e){
        this._setCurrentWorkspaceIndex(index)
        this._updateStatusButtons()
      }))

      this.hbox.add_child(button)
    }
    
    //*/

    this.actor.add_child(this.hbox) // difference to add_actor() (which is also working)?

    this._updateUI()

    this._screenSignals = []
    this._screenSignals.push(global.screen.connect_after('workspace-added', Lang.bind(this, this._updateUI)))
    this._screenSignals.push(global.screen.connect_after('workspace-removed', Lang.bind(this, this._updateUI)))
    this._screenSignals.push(global.screen.connect_after('workspace-switched', Lang.bind(this, this._updateUI)))

    this.actor.connect('scroll-event', Lang.bind(this, function(actor, event)
    {
      switch (event.get_scroll_direction())
      {
        case Clutter.ScrollDirection.DOWN:
          this._setCurrentWorkspaceIndex(this._getCurrentWorkspaceIndex() + 1)
          break
        case Clutter.ScrollDirection.UP:
          this._setCurrentWorkspaceIndex(this._getCurrentWorkspaceIndex() - 1)
          break
      }
    }))

    this._settings = new Gio.Settings({
      schema_id: WORKSPACE_SCHEMA
    })

    this._settingsChangedId = this._settings.connect('changed::' + WORKSPACE_KEY, Lang.bind(this, this._updateUI))
  },

  destroy: function()
  {
    for (let i = 0; i < this._screenSignals.length; i++)
    {
      global.screen.disconnect(this._screenSignals[i])
    }

    if (this._settingsChangedId)
    {
      this._settings.disconnect(this._settingsChangedId)
      this._settingsChangedId = 0
    }

    this.parent()
  },

  _getWorkspaceCount: function()
  {
    return global.screen.n_workspaces
  },

  _getCurrentWorkspaceIndex: function()
  {
    return global.screen.get_active_workspace().index()
  },

  _getWorkspaceName: function(workspaceIndex)
  {
    return Meta.prefs_get_workspace_name(workspaceIndex)
  },

  _getCurrentWorkspaceName: function()
  {
    return this._getWorkspaceName(this._getCurrentWorkspaceIndex())  
  },

  _setCurrentWorkspaceIndex: function(workspaceIndex)
  {
      // OLD (not needed, gnome shell detects limit by itself)  if ((workspaceIndex >= 0) && (workspaceIndex < this._getWorkspaceCount())) { ... }
      let metaWorkspace = global.screen.get_workspace_by_index(workspaceIndex)
      metaWorkspace.activate(1) // OLD: metaWorkspace.activate(global.get_current_time())
  },

  _updateUI: function()
  {
    this._buildWorkspaceMenu()
    this._updateStatusLabel()
    this._updateStatusButtons()
  },

  _updateStatusLabel: function()
  {
    this.statusLabel.set_text(this._getCurrentWorkspaceName())
  },

  _updateStatusButtons: function()
  {
    this.statusButtons.forEach(Lang.bind(this, function(button,i)
    {
      button.child.text = this._getWorkspaceName(i)
      button.child.style_class =
        'panel-workspace-indicator-label' +
        (i == this._getCurrentWorkspaceIndex() ? ' panel-workspace-indicator-label-active' : '')
    }))
  },

  _buildStatusUI: function()
  {
    // FIXME: not yet implemented. status bar buttons do not change when workspaces are being added or removed (e.g. in extension settings)
  },

  _buildWorkspaceMenu: function()
  {
    if (!this._workspaceSection)
    {
      this._workspaceSection = new PopupMenu.PopupMenuSection()
      this.menu.addMenuItem(this._workspaceSection)

    } else {
      this._workspaceSection.removeAll()
    }

    let menuItem

    let currentWorkspaceIndex = this._getCurrentWorkspaceIndex()
    for (var i = 0; i < this._getWorkspaceCount(); i++)
    {
      menuItem = new PopupMenu.PopupMenuItem(this._getWorkspaceName(i))
      if (i == currentWorkspaceIndex) menuItem.setActive(true) // menuItem.setOrnament(PopupMenu.Ornament.DOT) // PopupMenu.Ornament.NONE

      let index = i
      menuItem.connect('activate', Lang.bind(this, function(actor, event)
      {
        this._setCurrentWorkspaceIndex(index) // /actor.workspaceId)
      }))

      this._workspaceSection.addMenuItem(menuItem)
    }

/*
    let sec2 = new PopupMenu.PopupMenuSection()
    this.menu.addMenuItem(sec2)
    sec2.addMenuItem(new PopupMenu.PopupMenuItem('First'))
    sec2.addMenuItem(new PopupMenu.PopupMenuItem('First2'))
    sec2.addMenuItem(new PopupMenu.PopupMenuItem('First3'))
*/
  }
})

/* --- global extension functions --- */

let _indicator

function init(meta)
{
  Convenience.initTranslations()
}

function enable()
{
  _indicator = new WorkspaceIndicator
  Main.panel.addToStatusArea('workspace-indicator', _indicator)
}

function disable()
{
  _indicator.destroy()
}
