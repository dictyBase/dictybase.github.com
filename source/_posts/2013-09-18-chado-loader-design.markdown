---
layout: post
title: "Structuring of a chado database loader"
date: 2013-09-18 13:44
comments: true
sharing: true
author: Siddhartha Basu
categories: 
  - chado
  - database
  - loader
  - design
---

# Preamble
This is more or less my thoughts about how to structure a bulk loader for chado. 
Majority of the ideas come from writing ```obo2chado``` loader. __obo2chado__ still lack the design that 
i am aiming now, but most of the upcoming one will follow that. And the future idea is to refactor the ```obo``` loader to that mold.

# Design
## Scope and expectation
* The input would be some sort of flat file.
* The data will be loaded to a relational backend. It could definitely be generalized, but at this moment it is not considered.

## Reading data 
There should be an object oriented interface for reading data from flat files. That object is expected to be passed 
along to other classes. For example, for ```obo2chado``` loader i have used the [ONTO-Perl](https://metacpan.org/release/ONTO-PERL) module.

## Database interaction
Probably one of the import one. It's better to have an ORM that supports mutiple backends and bulk loading support. For Perl 
code, i have used [BCS](https://metacpan.org/module/Bio::Chado::Schema) a ```DBIx::Class``` class layer for __chado__ database.

## Loading in the staging area
This part is supposed to get data from flat file to temp tables of RDBMS. To start with, lets assign a class which 
will manage everything related to this task. First lets figure out what kind of information the class needs in order to perform those tasks.
For the sake of understaing we name it as ```StagingManager``` ....

### Staging manager

#### Attributes
* __schema:__ Should have an instance of ```Bio::Chado::Schema```. A ORM/Database object for all database centric tasks. 
If its an __ORM__, then it should better provide access to 
some bulk mode operation or at least low level objects for bulk support.
* __chunk_threshold:__ I kind of thrown this in, it will be used for bulk loading in chunk. 
* __sqlmanager:__ Should have an instance of ```SQL::Lib```. A class that manages handling of sql statements. I found it easy to manage instead of
  inlining it in the class itself. With growing sql statments, it could become
  cumbersome to navigate through code. Provides better separation between code and
  non-code content. For ```obo2chado```, i have used
  [SQL::Library](https://metacpan.org/module/SQL::Library) module, seems to be a very
  good choice.
* __logger:__ An instance of an logger.


<!-- more -->


#### Methods
* __create_tables:__ Create temporary tables.
* __create_indexes:__ Create indexes/constraints in temp tables as necessary.
* __drop_tables:__ Drop temp tables if necessary(probably not needed).
* __bulk_load:__ Load data in those temp tables, should be in bulk mode. If there are multiple data sections going to different 
temp tables and they are independent then loading could be __parallalized__. This method
is expected to be backend specific, so for example for _postgresql_ backend, we used
__COPY__ command to load the data.
* __add_data:__ This would be more or less to add a row of ```data_object``` to the manager. It will cache the data unless 
it is above threshold and ```load_data``` is invoked. 
```perl
my $iter = $data_file->iterator;
while(my $data_row = $iter->next) {
    $staging_loader->add_data($data_row);
    if ($staging_loader->entries_in_cache > $staging_loader->cache_threshold) {
        $staging_loader->bulk_load;
        $staging_loader->clear_cache;
    }
}
```
Remember, there will be a separate manager class for each backend. However, they should share a identical __interface__.

And then the common attributes and methods are then put into an interface _role_ which
any staging loader have to consume and implement.



### Helpers

In addition, we also need some helper classes that could have the following responsibilities:

* __Managing data caches:__ It could be any implementation that provides a temporary storage. So, far i have used a simple in memory array for ```ob2chado``` loader.
It is implemented as a __parametric__ Moose [Role](https://github.com/dictyBase/Modware-Loader/blob/develop/lib/Modware/Role/WithDataStash.pm).
Consume that role in a Moose class..
```perl
package Myclass;
use Moose::Role;
with 'Modware::Role::WithDataStash' =>
    { create_stash_for => [qw/term comment/] };
```
The above will import four methods/element making a total of 8 methods in the class.
For term it will import ...
```
add_to_term_cache
clean_term_cache
entries_in_term_cache
count_entries_in_term_cache
```
The use will be very simple...
```perl
$self->add_to_term_cache($term);
say $self->count_entries_in_term_cache;
for my $term($self->entries_in_term_cache) {
    .......
}
```

* __Basic CRUD for database:__ It is absolutely chado specific pattern where four tables __cv__,__cvterm__, __dbxref__ and __db__
are frequently reused. Here is one of the [implementation](https://github.com/dictyBase/Modware-Loader/blob/develop/lib/Modware/Loader/Role/Ontology/WithHelper.pm).
It provides bunch of reusable methods that  mostly works on one of the four tables
mentioned earlier... 
```
find_or_create_dbrow
find_or_create_cvrow
find_or_create_cvterm_namespace
```

* __Data transformations__: There are few methods needed here and there, however currently
  they are private to the other helpers. Still nothing there which stands out.

However, these are not set in stone and there could be handful of __helper__ classes. And it depends on the __manager__ 
class which one it needs to consume. But its important to share the helper classes for different backend 
specific __manager__ class. So, all the helper classes should have a defined interface.

{% img /images/staging_manager.png %}


## Loading into chado from staging
Quite obviously, the responsible entity(or class) will transfer the data to the actual
tables in chado database. Lets get down to the interface ....

### Attributes
* __schema__: Mentioned earlier.
* __sqlmanager:__ Similarly, mentioned earlier.

### Methods
* __alter_tables__: To prepare chado tables for bulk load, such as disabling indexes
and/or foreign keys etc, if needed.
* __bulk_load:__ This method generally runs a series of all _sql_ statements to do the
actual data loading.
* __reset_tables__: Should reset the chado tables to its pristine states if the
``alter_tables``` method did any change. Also any other procedure. 
* __logger:__ An instance of an logger.

The methods should run in the following order ...
```
alter_tables
bulk_load
reset_tables
```

{% img /images/chado_manager.png %}


This loading phase should run after the staging as it needs data from staging tables. As
usual, the methods and attributes should be wrapped around a generic interface _role_.


## The loader itself
The loader would be provide a command line/webapp interface that basically coordinate
these managers(both staging and chado) to load it. The loader frontend also ensures that
all the steps are executed in order. Here's how the software stack interacts with each
other.

{%img /images/loader_stack.png %}

* The loader frontend only has direct interaction with the flat file, however it does
  not have any connection with storage backend. It does also interacts with both the
  managers.
* Staging manager interacts with only temp storage whereas Chado manager interacts with
  both storages. However, the managers are completely decoupled.

The diagram below shows how the data ultimately made it from the flat file to the chado
database.

{%img /images/loader_dataflow.png %}

* The data get pushed by the frontend to the ```Stagingmanager``` and then into staging
  tables. 
* The ```Chadomanager``` then pulls it from staging table and push it back to the chado
  database.


