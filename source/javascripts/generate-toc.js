function generateTOC(insertBefore,  heading) {
  var container = jQuery("<div id='tocBlock'></div>");
  var div = jQuery("<ul id='toc'></ul>");
  var content = $(insertBefore).first();
      
  if (heading !== undefined && heading !== null) {
            container.append('<span class="tocHeading">' + heading + '</span>');
  }
              
  div.tableOfContents(
         content, 
     {
        startLevel: 2,     // H2 and up
        depth:      3     // H2 through H4, 
     }
  );
  container.append(div);
  var x = jQuery(jQuery("article").children().get(1)).prepend(container);
}
