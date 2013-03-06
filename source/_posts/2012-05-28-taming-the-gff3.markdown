---
layout: post
title: "Taming the dictybase GFF3"
date: 2012-05-28 08:15
author: Siddhartha Basu
toc: true
comments: true
sharing: true
categories: 
 - Sequence ontology
 - Genomic feature
 - Gene model
 - GFF3
---

dictyBase [GFF3](http://dictybase.org/download/gff3/dicty_gff3.zip) has developed 
bunch of rough edges over the years and so do not plays well with third
party tools. Here are the issues that we are aware of...


##Known Issues

* Genes with multiple gene models could easily be confused as splice isoforms. It is
  particularly hard to separate in case of known
  [isoforms](http://dictybase.org/Downloads/alternative_transcripts.html). There is also
  no easy way to identify the primary gene models.

* Pseudogenes are not represented with proper
  [SO](http://www.sequenceontology.org/resources/intro.html) terms. The pseudogenes used
  __gene__ SO term whereas the transcript is represented by __pseudogene__ term. 

* More than handful of assembly gap coordinates falls outside the range of reference
  feature.

* CDS features do not have a value for phase column,  which is required in GFF3
  specification.

* Missing target attribute of EST features. This is becasue the aligned coordinates of EST
	sequences are not present in our chado database,  probably left out during the
	loading process.

## Possible solutions

* The gene models will be split into individual GFF3 file for canonical, curated and predicted gene models. The
	canonical will be the core GFF3 with all the chromosomes, contigs and genomic sequences.
	The rest of them (curated and predicted) will be supplemental and will contain only gene
	structures,  no sequences and assembly features though. By default,  all
	chromosomal features will be kept in a single file.

* The pseudogene gene model will be fixed, the transcript will be
	__psuedogenic_transcript__ whereas the exons will be __psuedogenic_exon__.

* No more export of **gap** features at this point. 

* CDS features will not be exported at this point,  would be included at a later point
	along with the phase column.

* Rerun the EST pipeline and load alignments with EST sequence locations. It will ensure
	the presence of __Target__ attribute. It will be available as separate alignment
	GFF3 file. However,  until the rerun is finished the existing alignment GFF3 will be
	without the __Target__ attribute.
