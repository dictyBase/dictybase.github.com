---
layout: page
title: "Tblastn protein alignments with refinement"
date: 2013-03-20 16:40
comments: true
sharing: true
footer: true
enlist: true
documentation: true
author: Siddhartha Basu
---

Tblastn alignments needs to be refined as they do not properly align around exon intron
boundaries,  group hsps wide apart,  also might get aligned to the repeat regions. The
approach would be ... 

* Align against a repeat masked database.
* Repeat filtering with dust
* Run tblastn and specify `max-intron-lengh`.
* Further post process the alignments and convert to gff3.

### Mask genome sequence
   An example with pallidum supercontig
```bash

    dustmasker -in pallidum_supercontig.fasta -infmt fasta \
       -parse_seqids -outfmt maskinfo_asn1_bin  \
       -out pallidum_supercontig_dust.asnb
```

### Make blast database with masking information

```bash

    makeblastdb -in pallidum_supercontig.fasta -dbtype nucl -parse_seqids \
        -mask_data pallidum_supercontig_dust.asnb -out pallidum_supercontig
```

### Run tblastn
It's a mapping protocol, so the search is expected to be on the insensitive side. The parameters are going to be selected to make the search as stringent as possible without loosing the top alignments. 


```bash

     tblastn -evalue 1e-10 -threshold 999 -max_intron_length 3000  \
         -outfmt 5 -db_soft_mask 11 -max_target_seqs 5 \
         -num_threads 8  -db pallidum_supercontig 
         -query discoideum_polypeptide.fasta  \
         -out pallidum/discoideum_tblastn.xml
```

* __e-value          :__ 1e-10, we have tried this before and seems a good starting point.
* __threshold        :__  999, Neighborhood threshold value, a high value makes the seeding phase extremely stringent.
* __db_soft_mask     :__  Uses soft masking in database generated before by dustmasker.
* __max_target_seqs  :__  Maximum no of hits per discoideum protein that will be reported in the output. In this case it will only have top five alignments.

### Refine TBLASTN alignments and convert it to GFF3
        
 Run the  _blast2gbrowsegff3_  perl script from [Modware Loader](https://github.com/dictyBase/Modware-Loader/blob/develop/lib/Modware/Transform/Command/blast2gbrowsegff3.pm) distribution.

```bash
perl -Ilib bin/modware-transform blast2gbrowsegff3 \
      -i pallidum/discoideum_tblastn.xml \
      -o pallidum/discoideum_tblastn.gff3 --format blastxml \
      --query_id_parser general  --desc_parser ncbi \
      --source tblastn.dictyBase  --max_intron_length 3000 \
      --merge_contained --remove_stop_codon
```

Because of the nature of the blast statistics, blast aligns wherever it can. As a result, it has multiple alignments in the same region, sometimes the aligned regions are out of order and for translated blast it also extends through stop codons.
So, bunch of filtering options are used during the above conversion ...

**max_intron_length:** 3000 bp. It is the maximum distance(in bp) allowed between two consecutive hsps(High scoring pair) of a tblastn hit. Since, blast statistics do not account for splice junctions or exon intron models, it tends to group hsps that are far apart in the genome.  This option split hsps(into separate hit groups) that are more than _max_intron_length_ apart. The maximum intron length (```3000 bp```)  is calculated from the multi exonic gene models(curated and predicted) of various dictyostelids(discoideum,purpureum,fasciculatum and pallidum). 

**merge_contained:** This activates merging of overlapping hsps(```high scoring pair```). In this case, the hsps whose start and end falls within another are merged with the larger one. The alignment attributes of larger ones are kept.

**remove_stop_codon:** In the first step the hsps are regrouped based on their strand and frame of their alignment which means a single hit could be split into maximum possible of  ```6 groups```.  In the next step, the genome(```subject```) sequence in hsp alignment is checked for extension through stop codon. If found, that hit along with the hsps are discarded.

Overall, the filtering options  helps to provide a best possible  contiguous alignment with one or more segments(```hsp```). The options are tuned for hsps aligned in the exon regions where two or more grouped hsps will flank the intervening introns. Few examples,

**Alignment with pallidum**

![pallidum alignment](http://genomes.dictybase.org/browser/gbrowse_img/pallidum/?name=PPA1366818:64600..66300;l=Gene%1EGenes%20Overview:region%1EGenemodel%1Ediscoideum_tblastn_alignments%1EContigs%20Overview:overview;width=1024;id=e366cd5d931987f0c2eae09e45696c42;format=GD;keystyle=between;grid=on;h_feat=eria@yellow)


**Alignment with purpureum**

![purpureum alignment](http://genomes.dictybase.org/browser/gbrowse_img/purpureum/?name=scaffold_112:1..20315;l=Gene%1EGenes%20Overview:overview%1EGenemodel%1EPredictions%1Ediscoideum_tblastn_alignments;width=800;id=e366cd5d931987f0c2eae09e45696c42;format=GD;keystyle=between;grid=1;h_feat=dpu_g0052220@yellow)

