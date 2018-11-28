# ReloadTaskStatus

Reload task status is extension usable to show status of reload task in application.

Prerequisites: 
for not admin users - security rule for user to read access for reloadtasks, ExecutionResult* and executionsession* resource

Configuration: 
 - Refresh interval in ms - interval for reload task status check 
 - Task ID - specific task can be filled. If field is clear, taskId is detected automatically
 - ShowCircle - show or hide status circle
 - ShowLables - show or hide text status of  reload task
 - CircleSize - change circle size
    
See also Reload Task Button https://github.com/teamEMARK/ReloadTaskButton
