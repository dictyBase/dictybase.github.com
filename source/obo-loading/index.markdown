---
layout: page
title: "Ontology data model in chado database"
date: 2012-11-16 10:14
comments: true
sharing: true
footer: true
enlist: true
---

Chado database is driven by ontology(Controlled vocabulary)  and it is very important,
core and somewhat complicated to model it properly. And like any other data model,  it is
better to break down the steps and approach it in step by step. The various parts of the
model are desribed in piece by piece in their dependent order in which the first one need to be
done first and so on.

## Ontology information and namespace

{% img /images/cvproperty.jpg %}

The ontology namespace gets in the __name__ column and the version and date values goes in
the __value__ column of __cvprop__ table. Following the standard pattern in chado model,
each value also gets qualified with an __ontology terms__ from __cvprop ontology__. The
__cvprop__ ontology has to be stored first in order for any other ontology to store any of
their ontology properties. 

```sql  model for ontology properties
SELECT cv.name,cvprop.value FROM cv
 JOIN cvprop ON cv.cv_id=cvprop.cv_id
 JOIN cvterm propterm ON propterm.type_id=proptype.cvterm_id
 JOIN cv proptype ON proptype.cv_id=propterm.cvterm_id
 WHERE proptype.name = 'cvprop';
```

## Miscellaneous namespaces
This is a one time setup and reused to hold various properties of __ontology
term(cvterm)__ such as comment, alternate ids,  database cross references(xrefs) etc. 

### internal
Namespace in db table,  stored in name column,  used in case of dbxrefs
without any defined namespace

### comment
This is a cvterm namespace to store comment for every cvterm.For this,   a __comment__ cvterm is created under __cvterm_property_type__ namespace inside
the __internal__ db namespace. Quite naturally,  it is stored identically to the model of a
cvterm(ontology term, details given below).

{% img /images/comment_namespace.jpg %}

### synonym
For this,  a cv namespace __synonym_type__ is created.

### alternate ids
Exactly similar to __comment__ structure,  except a cvterm __alt_id__ is created.

{% img /images/alt_namespace.jpg %}

### xrefs(database cross references)
An __xref__ cvterm is created,  model is identical to comment or alt_id.

### synonym types
There are four synonym types,  EXACT,  BROAD,  NARROW and RELATED,  a cvterm is created
for each of them under __synonym_type__ namespace.

{% img /images/synonym_type_namespace.jpg %}

### relationship property types
There are six of them ...

* cyclic
* reflexive
* transitive
* anonymous
* domain
* range

Stored in a similar fashion as that of _synonym_types_

{% img /images/relprop_namespace.jpg %}


## Cvterm(Ontology term)

### Term name and id
The idea for modeling the term itself is essentially the same as that of __comment__ and
__alt_ids__.

{% img /images/cvterm.jpg %}

The term's name goes in _cvterm.name_ and the identifier(id) goes to _dbxref.accession_
column. The cv and db namespaces are created before and are reused for every instance of
term. For relationship term,  _is_relationship_ column is set to true. Terms once stored
generally don't get deleted,  rather _is_obsolete_ column flag is toggled for that.

```sql List of term name and identifier in an ontology
SELECT cvterm.name name, dbxref.accession identifier
 FROM cvterm
 JOIN dbxref ON cvterm.dbxref_id=dbxref.dbxref_id
 JOIN cv ON cv.cv_id=cvterm.cv_id
 WHERE cv.name = 'gene ontology'
```

### Synonym

### Alternate id

### Comment

### Xref

### Relationship term properties

## Term relation
