---
'@greypan/web-ui': major
---

The built-in user-visible strings of the components are now English. They are the accessible names of the internal controls (the slider track, the dialog and drawer close buttons, the input and textarea clear buttons, the context menu panel, the image preview controls, the spinner, the badge counter, the layout sidebar controls and the toast close button) and the messages the components hand to the browser's native form validation.

A Chinese page embedding these components now reads English accessible names and sees English in the browser's validation bubble ("Select this option" instead of "请选择此项"). The components offer no way to override those strings, so a page that needs another language has to replace the affected internals itself.

The slider thumb shape and its size tokens change in the same release, see the other changeset.
