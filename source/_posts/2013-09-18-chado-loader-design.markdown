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
This part is supposed to get the data from flat file to the temp tables of RDBMS. To start with, lets assign a class which 
will manage everything related to this task. Here are the responsibilities that i could think of:

* Create temp tables.
* Create indexes/constraints in temp tables as necessary.
* Drop temp tables if necessary(probably not needed).
* Load data in those temp tables, should be in bulk mode. If there are multiple data sections going to different 
temp tables and they are independent then loading could be __parallalized__.
* Provide some sort of interface to give a ballpark about number of rows in those temp tables.
Remember, there will be a separate manager class for each backend. However, they should share a identical __interface__.

<!-- more -->


Now lets figure out what kind of information the class needs in order to perform those tasks.

* A ORM/Database object for all database centric tasks. If its an __ORM__, then it should better provide access to 
some bulk mode operation or at least low level objects for bulk support.

So, lets have a first pass on the interface. First the fields/attributes..

### Attributes
* schema: 
* chunk_threshold: I kind of thrown this in, it will be used for bulk loading in chunk. For details, check the __methods__ section below.

### Methods
* create_tables:
* drop_tables:
* create_indexes:
* bulk_load:
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
