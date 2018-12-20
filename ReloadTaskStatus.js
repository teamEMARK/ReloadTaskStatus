define(["jquery", "qlik", "text!./ReloadTaskStatus.css"], function($, qlik, cssContent) {
  $("<style>").html(cssContent).appendTo("head");

	var getReloadTaskId = function(appId){
		return qlik.callRepository( '/qrs/reloadtask/full').then( function ( reply ) {
			//return reply.data.filter(function(task){ return task.app.id == appId; })[0].id;
			var tasks = reply.data.filter(function(task){ return task.app.id == appId; });
			if(tasks[0]) return tasks[0].id;
			else return undefined;
		});
	};
	
	var checkReloadTaskId = function(taskId){
		return qlik.callRepository( '/qrs/reloadtask/'+taskId).then( function ( reply ) {
			return true;
		}, function (error){
			return false;
		});
	};

	var getReloadSessionId = function(taskId, $element){
		if (taskId == undefined) return undefined;
		return qlik.callRepository( '/qrs/executionsession').then( function ( reply ) {
			//return reply.data.filter(function(task){ return task.reloadTask.id == taskId; })[0].id;
			var sessions = reply.data.filter(function(task){ return task.reloadTask.id == taskId; });
			if(sessions[0]) return sessions[0].id;
			else return undefined;
		}, function (error){
			return undefined;
		});
	};


	return {
			support: {
				snapshot: false,
				export: false,
				exportData: false
			},
	
		paint: function ($element, layout) {
 			if(this.initialized) return;
			var $scope = this.$scope;
			this.initialized = true;
    	    var app = qlik.currApp(this);
			var appId = app.id;
			
			var taskId = undefined;
			var sessionId = undefined;
			
			var refreshInterval = 3000;
			var showLabels = false;
			var showCircle = false;
			var intervalId;
			var circleSize;
			var self = this;
			
			var circle = $('<div class="" style="position:top"></div>');
			var circle_text = $('<span class=""></span>');
			
			var label = $('<div class="" style="text-align:left"></div>');
			var text_reload = $('<span></span><BR>');
			var text_status = $('<span></span>');
			
			//console.log("$scope.layout.pTask: " , $scope.layout.pTask);
			
			if ($scope.layout.pTask == "") {
				getReloadTaskId(appId).then(function(id){
					taskId = id;
				});
			} else {
				taskId = $scope.layout.pTask;
				checkReloadTaskId(taskId).then(function(value){
					if (!value) {
						taskId = undefined;
					}
				});
				//TODO check if task exist
			}
			
			refreshInterval = $scope.layout.pRefresh;
			showLabels =  $scope.layout.pLabels;
			showCircle =  $scope.layout.pCircle;
			//console.log("refreshInterval: " + refreshInterval + "  showLabels: " + showLabels + " showCircle:" + showCircle);
		
			// Display Extension Visualization
			if (!showCircle || $scope.layout.pCircleSize == undefined) {
				//console.log("$scope.layout.pCircleSize: " , $scope.layout.pCircleSize);			
			} else {
				var circleSize = $scope.layout.pCircleSize+'px'
				document.documentElement.style.setProperty('--main-circle-size',circleSize);
			}
			
			$element.addClass('emark-rs');

			if (showCircle) {
				$element.append(circle);
				circle.append(circle_text);
			}
			
			if (showLabels) {
				 label.append(text_reload);
				 label.append(text_status);
				 $element.append(label);
			} 

			intervalId = setInterval(function(){ checkStatus($element, taskId, circle, circle_text, label, text_reload, text_status, intervalId); }, refreshInterval);
		},
		controller: ['$scope', '$sce', function ( $scope, $sce ) {}],
			definition: {
				type: "items",
				component: "accordion",
				items: {
					dmServer: {
						label: "Settings",
						type: "items",
						items: {
							RefreshProp: {
								ref: "pRefresh",
								type: "number",
								defaultValue: 3000,
								label: "Refresh interval in ms",
								expression: "optional"
							},
							CircleProp: {
								ref:"pCircle",
								type: "boolean",
								label: "Show Circle",
								defaultValue: true,
								expression: "optional"
							},
							CircleSizeProp: {
								ref:"pCircleSize",
								label: "Circle Size",
								type: "number",
								component: "slider",
								min: 10,
								max: 200,
								step: 5,
								defaultValue: 50
							},
							LabelsProp: {
								ref:"pLabels",
								type: "boolean",
								label: "Show Labels",
								defaultValue: false,
								expression: "optional"
							},
							TaskProp: {
								ref:"pTask",
								type: "string",
								label: "Task id",
								expression: "optional"
							}							
						}
					},
					about: {
						label: "About",
						type: "items",
						items: {
							text: {
								label: "EMARK Reload Task Status extenstion",
								component: "text"
							},				
							version: {
								label: 'Version: 0.2',
								component: "text"
							}					

						}
					}
				}
			}	
	};
	
	function checkStatus($element, taskId, circle, circle_text, label, text_reload, text_status, intervalId) {
		if (taskId == undefined) {
			 label.append(text_reload);
			 $element.append(label);
			 text_reload.text('Reload task not present. Please create reload task and reload application');
			 clearInterval(intervalId);

		} else {
			getReloadSessionId(taskId, $element).then(function(id){
			var sessionId = id;
			getTaskStatus(sessionId, $element, function(stat) {
			if (stat == 1 || stat == 2 || stat == 3 || stat == 4 || stat == 5) {
				circle.removeClass('circle-green');
				circle.addClass('circle-red');
				circle_text.text('');

				label.removeClass('dark');
				label.addClass('red');
				text_reload.text('Reloading.');
				text_status.text('');
				

			} else  {
				circle.removeClass('circle-red');
				circle.addClass('circle-green');
								
				label.removeClass('red');
				label.addClass('dark');
				
				qlik.callRepository( '/qrs/reloadtask/' + taskId,'GET').then( function ( reply ) {
					var stopTime = reply.data.operational.lastExecutionResult.stopTime;
					var lastStatus = reply.data.operational.lastExecutionResult.status;
					lastStatusStr = "";
					
					switch(lastStatus) {
				    case 0:
        				lastStatusStr = 'Never started';
						circle_text.text('');
        			break;
				    case 1:
						lastStatusStr = 'Triggered';
						circle_text.text('');
        			break;
				    case 2:
						lastStatusStr = 'Started';
						circle_text.text('');
        			break;
				    case 3:
        				lastStatusStr = 'Queued';
						circle_text.text('');
        			break;
				    case 4:
        				lastStatusStr = 'Abort initiated';
						circle_text.text('');
        			break;
				    case 5:
        				lastStatusStr = 'Aborting';
						circle_text.text('');
        			break;
				    case 6:
        				lastStatusStr = 'Aborted';
						circle_text.text('?');
        			break;
				    case 7:
        				lastStatusStr = 'Success';
						circle_text.text('');
        			break;
				    case 8:
        				lastStatusStr = 'Failed';
						circle_text.text('!');
        			break;
				    case 9:
        				lastStatusStr = 'Skipped';
						circle_text.text('');
        			break;
				    case 10:
        				lastStatusStr = 'Retrying';
						circle_text.text('');
        			break;
				    case 11:
        				lastStatusStr = 'Error';
						circle_text.text('!');
        			break;
				    case 12:
        				lastStatusStr = 'Reset';
						circle_text.text('');
        			break;
					default:
					} 
					if (stopTime == '1753-01-01T00:00:00.000Z') {
						text_reload.text('');
					} else {
						stopTime = stopTime.replace("T", " ");
						stopTime = stopTime.slice(0, -8);
						text_reload.text('Last reload: ' + stopTime);
						
						//var date = new Date(stopTime);
						//text_reload.text('Last reload: ' + moment(date).format('DD.MM.YYYY HH:MM'));
					}
					text_status.text('Status: '+ lastStatusStr);
				});
		
			}
		});
		}, function (error) {
			circle.removeClass('circle-red')
			circle.addClass('circle-green')
			
			label.removeClass('red')
			label.addClass('dark')
			text_reload.text('Reloaded.')
		});
		}
	}
	
 	function getTaskStatus(session,$element, callback) {
		if (session != undefined) {
			qlik.callRepository( '/qrs/executionresult?filter=ExecutionId eq ' + session, 'GET').success( function ( reply ) {
				if(reply && reply[0]){
					callback(reply[0].status);
				}else{
					callback(0);
				}
			} );					
		} else {
			callback(0);
		}
	};	

	
});
