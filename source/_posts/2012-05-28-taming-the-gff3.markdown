---
layout: post
title: "Taming the GFF3"
date: 2012-05-28 08:15
comments: false
author: Siddhartha Basu
published: false
categories: 
 - Sequence ontology
 - Genomic feature
 - Gene model
 - GFF3
---

dictyBase (GFF3)[http://dictybase.org/download/gff3/dicty_gff3.zip] file got
bunch of rough edges over the years and so do not always plays well with third
party tools. Here are the issues that we are aware of
* Genes with multiple gene models could easily be confused as splice isoforms. It is
  particularly hard to separate in case of known
  (isoforms)[http://dictybase.org/Downloads/alternative_transcripts.html]. There is also
  no easy way to identify the primary gene models.

* Pseudogenes are not represented with proper
  (SO)[http://www.sequenceontology.org/resources/intro.html]. The pseudogenes used
  __gene__ SO term whereas the transcript is represented by __pseudogene__ term. 

* More than handful of assembly gap coordinates falls outside the range of reference
  feature.

* CDS features do not have a value for phase column,  which is required in GFF3
  specification.

* Target attribute of EST features 
