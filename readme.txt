August 31, 2026 - learned how to create a free webpage online using GitHub.

The files are stored on my computer cloud drive, Documents\Github:

The GitHub desktop app will sync these to my GitHub account.

The original files are from my "Who Knew" stories published in MS Word. I used CLAUDE AI to convert the Word docs to HTML, and parked the images in a subdirectory.


HTML Tag info

Image sizes are controlled by defining a "plate"
By default it is simply <figure class="plate"> 

But you can force a small such as this, in the "Header / Style / Main Article / Body " section
 .plate-sm{ max-width:280px; margin-left:auto; margin-right:auto; }

Then specify that format in the "<figure>" tag
<figure class="plate plate-sm">

Here is a MEDIUM
 .plate-sm{ max-width:280px; margin-left:auto; margin-right:auto; }
 .plate-med{ max-width:400px; margin-left:auto; margin-right:auto; }

Invoked: <figure class="plate plate-med">


The following brute-force style worked:

   style="width:600px; height:auto;"
