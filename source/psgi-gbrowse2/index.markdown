---
layout: page
title: "Running PSGI gbrowse2"
date: 2013-03-20 15:17
comments: true
sharing: true
footer: true
enlist: true
documentation: true
author: Siddhartha Basu
---

### Preamble
* Skip this section if you just want to go ahead with installation.
* Read either of [PSGI readme](https://github.com/dictyBase/GBrowse-PSGI/blob/develop/README.psgi) or the blog [post](http://toddharris.net/blog/2011/09/11/running-the-generic-genome-browser-under-psgiplack).
* The steps below are essentially a modified version of the installation routine described above. 
* [Perlbrew](http://perlbrew.pl) is used for managing perl without root privileges and system perl is left alone.
* Perlbrew's local lib feature is used for managing dependencies.
* [cpanm](https://metacpan.org/module/cpanm) is used for installing dependencies.
* For deployment purposes modules are installed without running the unit tests(cpanm -n)

### Perl environment
* Install [perlbrew](http://perlbrew.pl)

```
curl -kL http://install.perlbrew.pl | bash
```

* Then setup your bash environment as instructed by perlbrew. Typically that will be in your .bashrc

```bash
source ~/perl5/perlbrew/etc/bashrc
```

* For custom installation of perlbrew set the PERLBREW_HOME environmental variable. For example if it needs to be installed in a shared folder such as /home/gbrowse

```bash
export PERLBREW_ROOT=/home/gbrowse
curl -kL http://install.perlbrew.pl | bash
In the .bashrc
export PERLBREW_ROOT=/home/gbrowse
source ${PERLBREW_ROOT}/etc/bashrc
```
 
* Install perl

```bash
perlbrew install  perl-5.10.1
```

Alternatively, with some compile time options in a 64bit CentOs 6 system

```bash
perlbrew install perl-5.10.1 -j 4  -Duse64bitall  -Duselargefiles \ 
                -Aldflags='-L/lib64 -L/usr/lib64' -Dcc=g
perlbrew switch perl-5.10.1
```

* Install cpanm and some helper modules

```bash
perlbrew install-cpanm
cpanm -n App::pmuninstall App::cpanoutdated
```

* Create a standalone local lib for installing dependencies. Use a separate local lib for every version of gbrowse2

```bash 
     perlbrew lib create gbrowse-2.40
     perlbrew use lib perl-5.10.1@gbrowse-2.40 (perl version might vary)
     perlbrew switch lib perl-5.10.1@gbrowse-2.40 (make it permanent in the bash)
```

* Checkout gbrowse2 from github and go to the develop branch

```bash
git clone git://github.com/dictyBase/GBrowse-PSGI.git
git checkout -b develop origin/develop
```

* **Install dependencies**
* gbrowse2 needs [libgd2](http://boutel.com/gd) to function. Looks [here](http://gmod.org/wiki/GBrowse_2.0_Prerequisites) for installing in your OS. Instructions for debian,red hat based linuxes and MacOSX are given there. However, for a latest MacOSX with [homebrew](http://mxcl.github.com/homebrew/), you should do with **brew install**

```bash
HARNESS_OPTIONS=j4 cpanm -n --installdeps .
```

### Setup gbrowse2
**Most of the commands below are recommended to run from inside of gbrowse2 checkout folder**

* Set envrionmental variables. Vary the gbrowse version as needed.

```bash
export GBROWSE_ROOT=`pwd`/gbrowse
export GBROWSE_VERSION=2.40

The above will setup the folder where gbrowse2 html,js,
temporary files,sessions,images,config files etc will be kept.
```
**Note:** For CentOs with SELinux enabled install Term::ReadKey

```bash
cpanm Term::ReadKey
```

* Configure gbrowse2 path. Run the command below from the gbrowse2 checkout folder.

```bash
perl Build.PL --conf $GBROWSE_ROOT/$GBROWSE_VERSION/conf \
             --htdocs $GBROWSE_ROOT/$GBROWSE_VERSION/html \
             --cgibin $GBROWSE_ROOT/$GBROWSE_VERSION/cgi \
             --tmp $GBROWSE_ROOT/$GBROWSE_VERSION/tmp \
             --persistent $GBROWSE_ROOT/$GBROWSE_VERSION/tmp/persistent  \
             --databases $GBROWSE_ROOT/databases \
             --installconf n --installetc n   \
             --wwwuser $LOGNAME
```
* Install gbrowse2 libraries. Just press enter at the password prompt. Also answer 'no[n]' for apache2 restart.

**Note:** Again for CentOs with SELinux enabled, it will ask for sudo password. Just hit enter three times.

```bash
./Build install
```
* Edit the configuration files. It is recommended to edit the configuration files in the installed folder rather than the stock one. It gives the flexibility of having separate config files for every version.

```bash
cd $GBROWSE_ROOT/$GBROWSE_VERSION
and edit the files
Make sure the paths in the yeast demo files are being set properly.
```
* Run and test out gbrowse2 with plack

```bash
plackup $GBROWSE_ROOT/$GBROWSE_VERSION/conf/GBrowse.psgi
```
* Open http://localhost:5000/gbrowse in your browser

## Deploy
Two modes of plack deployment have been tested, [Starman](https://metacpan.org/module/Starman) as backend web server and standalone [FCGI](https://metacpan.org/module/Plack::Handler::FCGI) . Instructions are given for [nginx](http://nginx.org) however setting up with apache2 would be simple.
* Install nginx using your OS package manager.

### Nginx with Starman

* Install and then start **Starman**

```bash
cpanm Starman
plackup -s Starman --port 9000 --daemonize --pid /tmp/starman_gb2.pid \
    $GBROWSE_ROOT/$GBROWSE_VERSION/conf/GBrowse.psgi

The above will have Starman running in background on port 9000
```

* Open and edit the nginx.conf file. It will deploy it under /browser

```bash
## upstream block
upstream gb2 {
  server 127.0.0.1:9000
}

# backend server mapping
location /browser {
   proxy_read_timeout 300; 
   rewrite /browser/(.*) /$1 break;  
   proxy_pass http://gb2;
   proxy_set_header Host $host;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Host $host;
   proxy_set_header X-Real-IP $remote_addr;
} 

# serving static files directly instead of going through Starman
# better for deployment
# For every gbrowse version path have to be changed 
location /gbrowse2 {
   alias /home/ubuntu/GBrowse-PSGI/gbrowse/2.40/html;
   expires 30d;
}
```
* Open your browser at **http://localhost/browser/gbrowse**
* Stop Starman

```bash
kill `cat /tmp/starman_gb2.pid`
```

### Nginx with FCGI
**Note:** The gbrowse_img script do not work with this backend. It run only once and then gives no response.

* Install and start standalone FCGI

```bash
 cpanm FCGI FCGI::ProcManager
 plackup -s FCGI --nproc 10 --listen /tmp/gbrowse.sock --pid /tmp/fcgi_gb2.pid --daemonize \
                       $GBROWSE_ROOT/$GBROWSE_VERSION/conf/GBrowse.psgi
```

* Open and edit nginx.conf file

```bash
location /browser {
     set $script "";
     set $path_info $uri;
     fastcgi_pass unix:/tmp/gbrowse.sock;
     fastcgi_param  SCRIPT_NAME      /browser;
     fastcgi_param  PATH_INFO        $path_info;
     fastcgi_param  QUERY_STRING     $query_string;
     fastcgi_param  REQUEST_METHOD   $request_method;
     fastcgi_param  CONTENT_TYPE     $content_type;
     fastcgi_param  CONTENT_LENGTH   $content_length;
     fastcgi_param  REQUEST_URI      $request_uri;
     fastcgi_param  SERVER_PROTOCOL  $server_protocol;
     fastcgi_param  REMOTE_ADDR      $remote_addr;
     fastcgi_param  REMOTE_PORT      $remote_port;
     fastcgi_param  SERVER_ADDR      $server_addr;
     fastcgi_param  SERVER_PORT      $server_port;
     fastcgi_param  SERVER_NAME      $server_name;
}

# serving static files directly instead of going through perl FCGI
# better for deployment
# For every gbrowse version path have to be changed 
location /gbrowse2 {
   alias /home/ubuntu/GBrowse-PSGI/gbrowse/2.40/html;
   expires 30d;
}
```
* Open your browser at **http://localhost/browser/gbrowse**
* Stop FCGI 

```bash 
kill `cat /tmp/fcgi_gb2.pid` 
```
