List = null;
var en_api_key = 'WCGWKPB8M8DHHOTLP ';
i = 0;

require([
    '$api/models',
    '$views/list#List',
    '$views/buttons'
], function (models, List, buttons) {
    'use strict';

    List = List;


    var button = buttons.Button.withLabel('Sort');
    var buttons_example = document.getElementById('buttons');
    buttons_example.appendChild(button.node);

    // Drag content into an HTML element from Spotify
    var dropBox = document.getElementById('drop-box');
    dropBox.addEventListener('dragstart', function (e) {
        e.dataTransfer.setData('text/html', this.innerHTML);
        e.dataTransfer.effectAllowed = 'copy';
    }, false);

    dropBox.addEventListener('dragenter', function (e) {
        if (e.preventDefault) e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        this.classList.add('over');
    }, false);

    dropBox.addEventListener('dragover', function (e) {
        if (e.preventDefault) e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        return false;
    }, false);

    dropBox.addEventListener('drop', function (e) {
        if (e.preventDefault) e.preventDefault();
        var drop = models.Playlist.fromURI(e.dataTransfer.getData('text'));
        console.log(drop);
        this.classList.remove('over');
        showPlayList(models, drop.uri);
        

    }, false);

    models.application.addEventListener('dropped', function () {
        console.log(models.application.dropped);
    });

    function showPlayList(models, uri) {
        var playlist_metadata_properties = ['collaborative', 'description', 'name', 'owner', 'tracks'];

        models.Playlist.fromURI(uri)
            .load(playlist_metadata_properties)
            .done(function (p) {

                $('drop-box').innerHTML = p.name;

                var oldPlayList = $('#playlist-div')[0];
                oldPlayList.innerHTML = '';

                List.availableOptions.fetch = 'greedy';
                List.availableOptions.style = 'rounded';

                var listHtml = List.forPlaylist(p);
                console.log(listHtml);
                oldPlayList.appendChild(listHtml.node);
                listHtml.init();

                addSorting();

                p.tracks.snapshot().done(function (t) {
                    var tracks = t.toArray();
                    setTimeout( function(){  getTrackFromEchoNest(en_api_key, tracks); $("#bpm").html(""); }, 3000);

                    
                });
            });
    };

    var inverse = false;

    function addSorting() {

        $('button[class=\'sp-button\']')
            .click(function () {

                $('table[class=\'sp-list-table\']').find('td').filter(function () {
                    return $(this).index() === 4;
                }).sortElements(function (a, b) {

                        a = $(a).text();
                        b = $(b).text();

                        return (
                            isNaN(a) || isNaN(b) ?
                                a > b : +a > +b
                            ) ?
                            inverse ? -1 : 1 :
                            inverse ? 1 : -1;

                    }, function () {
                        return this.parentNode;
                    });

                inverse = !inverse;
            });
    }

    function getTrackFromEchoNest(api_key, tracks) {

        $.ajaxSetup({ traditional: true, cache: false });

        var url = 'http://developer.echonest.com/api/v4/track/profile?api_key=' + api_key ;
        var html = "<th class='sp-list-heading sp-list-cell-star' width='100px' >BPM</th>";
        var limit = 120;
        var remaining = 120;
        var reqTime;

        $(".sp-list-header-row").append(html);
        $(".sp-list-table .sp-list-colgroup").append("<col style='width:100px;'></col>");
        for (var i = 0; i < tracks.length; i++) {
            var x = 'tr[data-uri=\'' + tracks[i].uri + '\'] td[class=\'sp-list-cell sp-list-cell-album\']';
            var albumTd = $(x)[0]; //

            var echoId = tracks[i].uri.replace('spotify', 'spotify-WW');

            if( !localStorage.hasOwnProperty(tracks[i].uri) ){

                $.getJSON(url,
                    {
                        id: echoId,
                        format: 'json',
                        bucket: ['audio_summary']
                    }).done(function (data, status, jqXHR) {
                        limit = jqXHR.getResponseHeader("X-Ratelimit-Limit")
                        remaining = jqXHR.getResponseHeader("X-Ratelimit-Remaining")
                        
                        reqTime = jqXHR.getResponseHeader("Date").split(' ')[4];
                        var d = new Date(jqXHR.getResponseHeader("Date"));
                        reqTime= d.getMilliseconds();

                        if (checkResponse(data)) {
                            var songID = data.response.track.song_id;
                            var idMap = {};
                            idMap[songID] = data.response.track.foreign_id.replace(/spotify.*?\:/, 'spotify:');

                            $.ajaxSetup({traditional:true, cache: false});
                            url = 'http://developer.echonest.com/api/v4/song/profile?api_key=' + api_key ;
                            
                            if(remaining > 0){
                                $.getJSON(url,
                                    {
                                        id : songID,
                                        format: 'json',
                                        bucket:['audio_summary']
                                    }).done(function(data, status, jqXHR){

                                        remaining = jqXHR.getResponseHeader("X-Ratelimit-Remaining")
                                        
                                        var tempo = data.response.songs[0].audio_summary.tempo;

                                        localStorage.setItem( idMap[data.response.songs[0].id], tempo );

                                        var html = "<td class='sp-list-cell sp-list-cell-time' width='100px;' >  "+tempo+"</td>";
                                        $("tr[data-uri='"+tracks[i].uri+"']").append(html);  

                                    }).fail(function(e){

                                    }
                                );
                            }

                        }
                    }).fail(function(e){
                        $("#error").html("Server error.")
                    }
                );

            } else{
                var html = "<td class='sp-list-cell sp-list-cell-time' width='100px;' >  " + localStorage.getItem(tracks[i].uri) + "</td>";
                $("tr[data-uri='"+tracks[i].uri+"']").append(html);    
                console.log($("tr[data-uri='"+tracks[i].uri+"']"));
            }
               
        }

    }

    function checkResponse(data) {
        if (data.response) {
            if (data.response.status.code != 0) {
                console.log(JSON.stringify(data.response));
            } else {
                return true;
            }
        } else {
            error("Unexpected response from server");
        }
        return false;
    }

    function saveToJSON(){


    }
});
