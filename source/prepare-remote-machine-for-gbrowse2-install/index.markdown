---
layout: page
title: "Prepare remote machine for gbrowse2 install"
date: 2013-03-20 15:10
comments: true
sharing: true
footer: true
enlist: true
author: Siddhartha Basu
documentation: true
---


### Install packages 

* curl
* gcc
* make
* man
* nginx
* libgd2
* db and db-devel: The berkeley db database library
* git
* vim
* postgresql (only the client library should be fine) 
* samtools (optional and only if you need to display NGS data with BAM format)
 

For redhat based system, rpm of samtools are [available](http://pkgs.org/centos-6-rhel-6/epel-i386/samtools-0.1.18-2.el6.i686.rpm.html) from EPEL repository. Follow the install [instructions](http://pkgs.org/centos-6-rhel-6/epel-i386/samtools-0.1.18-2.el6.i686.rpm.html#howto). You need to install both the libraries and header files.

### Shared folders
The shared space will have ample space and will host all the checked out code and datasets that are needed for gbrowse2 display. All members within the shared group will have identical privileges inside the shared folder.

Execute the following steps in the remote server as root or preferably as an user with sudo permission.

We are going to setup /home/gbrowse as the shared folder here. Preferably mount this folder in a separate partition with at least 100G of space.

* Create folder, add user and shared group(deploy).

```
bash
$_> sudo mkdir -p /home/gbrowse
$_> sudo groupadd deploy
```
* Add users(triton) to this group who need shared access
```bash
$_> sudo usermod -a -G deploy triton
```

* Set setgid so every folder created under shared inherit from the parent permission. This means all folder will belong to the deploy group here. 
```bash
$_> sudo chgrp deploy gbrowse
$_> sudo chmod g+w gbrowse
$_> sudo chmod g+s gbrowse
```

* Setup acl so that all files and folders created under that shared space maintain uniform group privileges
```bash
$_> sudo yum -y install acl (for redhat)
```
* Edit /etc/fstab and remount
```bash
$_> sudo vi /etc/fstab
  add the acl entry                           VVV
$_> /dev/sdb1  /home/gbrowse   ext4  defaults,acl    1 2
$_> sudo mount /home/gbrowse -o remount
```

* Enable acl. First remove the default if any and then apply the new one. 
```bash
$_> sudo setfacl -k -b gbrowse
$_> sudo setfacl -d -m u::rwx,g::rwx,o::r-- gbrowse
```
The default(-d) flag applies to directories and it sets the default acl for all newly created folders and files.


### Next: Install [gbrowse2](/psgi-gbrowse2)








 

