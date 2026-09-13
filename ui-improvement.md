## UI Improvements
- Edit Song modal should have the previous values as the default values in the inputs/selects for a better UX
- After saving any of the parts, a toast notification is not displayed for notification to the user on success/error of the action, fix this
- When attempting to delete a song, an alert is shown for confirmation, replace that with an actual confirmation modal for a better UX
- Update the Voice part edit and display to be a seperate page and not a modal so that these items can be seen independently and updated accordingly for a better UX.
- Ensure that when a reference link is added and successful or erronenous, the toast notification is displayed accordingly, I can see that after it's been added, it's refetched, that's good UX already, add this to that
- Remove the static filtering of the song cards by voice parts, rather break up the songs page, to have those which are active sunday displayed on top and those which are those which are archived or rehersal, displayed under and both sections should have independent filtering on the UI based the filtering provided on the backend.
