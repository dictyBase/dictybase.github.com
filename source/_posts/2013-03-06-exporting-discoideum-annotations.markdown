---
layout: post
author: Siddhartha Basu
title: "Exporting D.discoideum annotations in GFF3 format"
date: 2013-03-06 14:55
comments: true
sharing: true
footer: true
enlist: true
categories: 
  - Genome
  - GFF3
  - Annotation
  - Modware-Loader
  - Perl
---


## Prerequisites

[Install](https://github.com/dictyBase/Modware-Loader/blob/develop/README.md#installation) modware loader from github. 
With a latest [cpanm](https://metacpan.org/release/App-cpanminus) (>1.6), it can be
also directly installed from github 


```
$_> cpanm git://github.com/dictyBase/Modware-Loader.git@release
```

Then follow the basic [introduction](/install-modware-loader) about using
__Modware-Loader__.

## Export genome annotations
As mentioned [before](/blog/2012/05/28/taming-the-gff3), annotations are exported in pieces.
First  gene models(canonical, non-coding, curated and predicated),  then alignments
and promoters. Exports are done by the __export__ subcommand of Modware-Loader.

{% include_code 'modware-export subcommands' lang:bash modware-export-commands.txt %}


### Common config file
A basic yaml config file to be used for all the exports.

```yaml 'gff3.yaml'
dsn: dbi:Oracle:database
user: username
password: password
feature_name: 1
```

<!-- more -->

All exports are done with __--feature_name__ options that exports the **name** of
reference feature in GFF3 column 1.

### Canonical

{% include_code 'subcommand to export canonical gff3' lang:bash modware-export-canonical.txt %}

It exports complete coding gene models along with contig and reference features. It could
be either of __curated__ or __predicted__(sequencing center) gene models where __curated__
models take precedence.

```bash
$_> modware-export  chado2dictycanonicalgff3 -c gff3.yaml  -o canonical.gff3
```

To dump only a particular chromosome(reference feature) pass either a name or id in the __--reference_id__
option.

```bash
$_> modware-export  chado2dictycanonicalgff3 -c gff3.yaml  --reference_id 6 -o canonical6.gff3
```

__Non-coding__
```bash
$_> modware-export  chado2dictynoncodinggff3 -c gff3.yaml -o data/noncoding.gff3
```

### Non-canonical
There will be three exports,  one for curated,  one for sequencing center and one for
reprediction pipeline. 


{% include_code 'subcommand to export sequencing center gene models' lang:bash modware-export-noncanonical.txt %}

Though,  we use different _subcommands_ theirs options are identical.

```bash
$_> modware-export chado2dictynoncanonicalgff3  -c gff3.yaml -o data/noncanonical_seq_center.gff3 
$_> modware-export chado2dictynoncanonicalv2gff3  -c gff3.yaml \ 
             -o data/noncanonical_norepred.gff3 
$_> modware-export chado2dictycuratedgff3 -c config/dicty_gff3.yaml -o data/curated.gff3
```

### Alignment
EST and couple of alignments from GenBank datasets.

{% include_code 'subcommand to export alignment' lang:bash modware-export-alignment.txt %}

```bash
$_> modware-export chado2alignmentgff3 -c gff3.yaml --org dicty \
      --reference_type chromosome  --feature_type EST -o data/EST.gff3
```
```bash
$_> modware-export chado2alignmentgff3 -c gff3.yaml --org dicty \ 
     --reference_type chromosome  --feature_type cDNA_clone -o data/cDNA_clone.gff3
```
```bash
$_> modware-export chado2alignmentgff3 -c gff3.yaml --org dicty -o data/genomic_fragment.gff3\ 
     --reference_type chromosome  --feature_type databank_entry \
     --match_type nucleotide_match 
```

### Misc
And ultimately some promoter features ..

```bash
$_> modware-export chado2alignmentgff3 -c gff3.yaml --org dicty -o data/promoter.gff3 \ 
    --reference_type chromosome --feature_type promoter --match_type promoter  
    --org dicty   --force_name 1 --add_description 1 --property 'details_url'
```
