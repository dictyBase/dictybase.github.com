---
layout: page
title: "Prepare and loading data for visualizing in gbrowse"
date: 2013-03-20 16:12
comments: true
sharing: true
footer: true
enlist: true
documentation: true
author: Siddhartha Basu
---


The scripts in Modware-Loader distribution will be needed for data export and format conversions.


* First [install](/install-modware-loader) Modware-Loader. 

### Export genome annotations in GFF3 format
The annotations are exported from chado oracle database.

* Exporting purpureum genome

```bash
$_> modware-export chado2gff3 --org purpureum --dsn 'dbi:Oracle:host=host;sid=sid' \ 
       -u chado -p chado  -o purpureum.gff3 --extra_gene_model Geneid \ 
        --include_aligned_feature EST --tolerate_missing --include_align_parts
```
The above line exports the _Dictyostelium purpureum_ genome in GFF3 format along with extra **gene models** and **EST** alignment features.
Many more examples of GFF3 exports are
[here](/blog/2013/03/06/exporting-discoideum-annotations)
 
### Including gene products in fasta header
+ Download the dictyostelium protein fasta [file](http://dictybase.org/db/cgi-bin/dictyBase/download/download.pl?area=blast_databases&ID=purpureum_protein.fas.gz)
+ [mapgeneid2prod.pl](https://gist.github.com/2023747) : Produces a map between Gene ID and product name.
+ [rewrite_dicty_fasta_header.pl](https://gist.github.com/2023749) : Rewrite the fasta write to include the product name.


### Aligning proteins to other genomes  using tblastn
Here, for examples,  _Dictyostelium discoideum_ proteins will be aligned to the top level assemblies(supercontigs) of pallidum genome. Detail alignment strategy with refinement is given [here](/refining-tblastn-protein-alignments). 


### Loading features from GFF3
The GFF3 data are going to loaded in Postgresql database using [BioPerl's SeqFeature](https://metacpan.org/module/Bio::DB::SeqFeature::Store) backend.

* Install DBI backend for Postgresql

```bash
cpanm DBD::Pg
```
**Note:** Do not set -Darch option while compiling perl with perlbrew, otherwise DBI won't get installed

* Load data

```bash
bp_seqfeature_load.pl --dsn 'dbi:Pg:database=purpureum' -a 'DBI::Pg' -u uuser \
-p passs -f --summary -c purpureum.gff3
```
If you load more feature in the same database just skip the -c options. However, 
if it also complains about feature yet not found in the database then also skip the (-f) option.

**Note:** For loading tblastn alignment skip the **-c**, but use the **-f** option.

* Edit and add database source in gbrowse configuration file.

### RNA-seq(NGS) alignments data
The alignments are expected to be in BAM format, if not run any standard NGS alignment pipeline(bowtie etc..) to get the BAM format. 

* Create a folder under $GBROWSE_ROOT/database

```bash
mkdir -p  $GBROWSE_ROOT/database/purpureum
```
* Index the BAM file

```bash
samtools index file.bam
```
* Also copy the fasta sequence of reference genome in the same folder

* Install perl binding for samtools

```bash
cpanm Bio::DB::Sam
```
* **Note:** If Bio::DB::Sam install fails, try to do it from source

```bash
  First download(samtools.sf.net) and compile samtools from source
cd samtools-<version>/
make
  It is fine if it cannot compile tview, it can happen in absense of curses library. It is not needed for the perl module
  
  Now download Bio::DB::Sam source (http://metacpan.org/module/Bio::DB::Sam)
cd Bio-DB-SAM-<version>
SAMTOOLS=<samtools-path> perl Build.PL
./Build install
```



* Edit and add the track configuration as described in this [guide](http://gmod.org/wiki/GBrowse_Volvox_SAM_Tutorial)



### **Next:** [Integrate](https://github.com/dictyBase/GBrowse-PSGI/wiki/Integrating-dictyBase-header-and-footer-gbrowse2) headers and footers with gbrowse
