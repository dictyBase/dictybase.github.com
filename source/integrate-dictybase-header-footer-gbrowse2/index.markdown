---
layout: page
title: "Integrate dictyBase headers and footers in gbrowse2"
date: 2013-03-20 16:16
comments: true
sharing: true
footer: true
enlist: true
documentation: true
author: Siddhartha Basu
---


### Setup header and footer
* checkout asset repository

```bash
cd /home/share
git clone git@github.com:dictyBase/dictyAssets.git
```
* Serve it through nginx

```bash
## in nginx.conf
location /assets {
    alias /home/share/dictyAssets;
    expires 30d;
}
```

* open configuration file for each genome and the following code to the header and footer section. For example, in purpureum.conf. Assume nginx is deployed in localhost

```perl
header = sub {
               use LWP::Simple;
               return LWP::Simple::get("http://localhost/assets/include/purpureum/page-header.html")
          }
footer = sub {
               use LWP::Simple;
               return LWP::Simple::get("http://localhost/assets/include/purpureum/page-footer.html")
          }
```

* **Note:** Had issue with both LWP::Simple and LWP::UserAgent in getting the response, so switched to HTTP::Tiny

```bash
cpanm HTTP::Tiny

header = sub {
               use HTTP::Tiny;
               my $resp = HTTP::Tiny->new->get("http://localhost/assets/include/purpureum/page-header.html");
               if ($resp->{success}) {
                  return $resp->{content};
               }
          }

footer = sub {
               use HTTP::Tiny;
               my $resp = HTTP::Tiny->new->get("http://localhost/assets/include/purpureum/page-footer.html");
               if ($resp->{success}) {
                  return $resp->{content};
               }
          }

```

* Run plack

```bash
plackup  -MLWP::Simple -s FCGI --nproc 10 --listen /tmp/gbrowse.sock --pid /tmp/fcgi_gb2.pid --daemonize \
                     $GBROWSE_ROOT/$GBROWSE_VERSION/conf/GBROWSE.psgi
```

Replace LWP::Simple with HTTP::Tiny if needed
